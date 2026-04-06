// app/api/auth/logout/route.ts - 登出

import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/db';
import { getSessionIdFromRequest } from '@/lib/auth';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const sessionId = getSessionIdFromRequest(request);
  if (sessionId) {
    const ctx = getRequestContext();
    const db = ctx.env.DB as D1Database;
    await deleteSession(db, sessionId);
  }

  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.set('session_id', '', { maxAge: 0, path: '/' });
  return response;
}

export async function GET(request: NextRequest) {
  return POST(request);
}
