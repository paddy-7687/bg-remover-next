// app/api/auth/me/route.ts - 获取当前用户信息

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getSessionIdFromRequest } from '@/lib/auth';
import { getUserMonthlyUsage } from '@/lib/db';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const sessionId = getSessionIdFromRequest(request);
  const ctx = getRequestContext();
  const db = ctx.env.DB as D1Database;

  const user = await getCurrentUser(db, sessionId);
  if (!user) {
    return NextResponse.json({ user: null });
  }

  const monthlyUsage = await getUserMonthlyUsage(db, user.id);
  const planLimit = user.plan === 'pro' ? 50 : 3;
  const monthlyRemaining = user.plan === 'one_time' ? 0 : Math.max(0, planLimit - monthlyUsage);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      plan: user.plan,
      plan_expires_at: user.plan_expires_at,
      bonus_credits: user.bonus_credits,
      monthly_used: monthlyUsage,
      monthly_limit: user.plan === 'one_time' ? 0 : planLimit,
      monthly_remaining: monthlyRemaining,
    }
  });
}
