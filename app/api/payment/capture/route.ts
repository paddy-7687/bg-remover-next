// app/api/payment/capture/route.ts - 捕获支付 & 激活权益

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getPayPalAccessToken, capturePayPalOrder, PLANS } from '@/lib/paypal';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const ctx = getRequestContext();
  const db = ctx.env.DB as D1Database;
  const env = ctx.env as unknown as {
    PAYPAL_CLIENT_ID: string;
    PAYPAL_CLIENT_SECRET: string;
  };

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');
  const token = searchParams.get('token'); // PayPal 的 order token

  if (!orderId || !token) {
    return NextResponse.redirect(new URL('/pricing?error=invalid_params', request.url));
  }

  try {
    // 查订单
    const order = await db.prepare(
      'SELECT * FROM orders WHERE id = ? AND status = "pending"'
    ).bind(orderId).first<{
      id: string; user_id: string; plan: string;
      amount: string; paypal_order_id: string;
    }>();

    if (!order) {
      return NextResponse.redirect(new URL('/pricing?error=order_not_found', request.url));
    }

    // 捕获支付
    const accessToken = await getPayPalAccessToken(env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET);
    const capture = await capturePayPalOrder(accessToken, token);

    if (capture.status !== 'COMPLETED') {
      return NextResponse.redirect(new URL('/pricing?error=payment_not_completed', request.url));
    }

    const now = Math.floor(Date.now() / 1000);

    // 更新订单状态
    await db.prepare(
      'UPDATE orders SET status = "paid", paid_at = ? WHERE id = ?'
    ).bind(now, orderId).run();

    // 激活权益
    const planKey = order.plan as keyof typeof PLANS;
    const planConfig = PLANS[planKey];

    if (planKey === 'one_time') {
      // 一次性包：增加 20 次 bonus_credits
      await db.prepare(
        'UPDATE users SET bonus_credits = bonus_credits + 20, updated_at = ? WHERE id = ?'
      ).bind(now, order.user_id).run();
    } else {
      // Pro 订阅：设置 plan 和过期时间
      const months = planConfig.months;
      const expiresAt = now + months * 30 * 24 * 60 * 60;
      await db.prepare(
        'UPDATE users SET plan = "pro", plan_expires_at = ?, updated_at = ? WHERE id = ?'
      ).bind(expiresAt, now, order.user_id).run();
    }

    return NextResponse.redirect(new URL('/dashboard?success=1', request.url));
  } catch (err) {
    console.error('Capture error:', err);
    const detail = encodeURIComponent(err instanceof Error ? err.message : String(err));
    return NextResponse.redirect(new URL(`/pricing?error=capture_failed&detail=${detail}`, request.url));
  }
}
