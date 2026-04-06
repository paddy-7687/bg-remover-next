// app/api/payment/create/route.ts - 创建 PayPal 订单

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getCurrentUser, getSessionIdFromRequest } from '@/lib/auth';
import { getPayPalAccessToken, createPayPalOrder, PLANS, type PlanKey } from '@/lib/paypal';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const ctx = getRequestContext();
  const db = ctx.env.DB as D1Database;
  const env = ctx.env as unknown as {
    PAYPAL_CLIENT_ID: string;
    PAYPAL_CLIENT_SECRET: string;
  };

  // 必须登录
  const sessionId = getSessionIdFromRequest(request);
  const user = await getCurrentUser(db, sessionId);
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { plan } = await request.json() as { plan: PlanKey };
  if (!plan || !PLANS[plan]) {
    return NextResponse.json({ error: '无效套餐' }, { status: 400 });
  }

  const host = request.headers.get('host') || '';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  try {
    const accessToken = await getPayPalAccessToken(env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET);

    const orderId = crypto.randomUUID();
    const returnUrl = `${baseUrl}/api/payment/capture?orderId=${orderId}`;
    const cancelUrl = `${baseUrl}/pricing?cancelled=1`;

    const { id: paypalOrderId, approveUrl } = await createPayPalOrder(
      accessToken,
      plan,
      returnUrl,
      cancelUrl
    );

    // 存订单
    const now = Math.floor(Date.now() / 1000);
    await db.prepare(
      'INSERT INTO orders (id, user_id, plan, amount, currency, paypal_order_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, "pending", ?)'
    ).bind(orderId, user.id, plan, PLANS[plan].amount, PLANS[plan].currency, paypalOrderId, now).run();

    return NextResponse.json({ approveUrl, orderId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '创建订单失败' },
      { status: 500 }
    );
  }
}
