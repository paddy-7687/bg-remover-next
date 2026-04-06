// app/api/auth/login/route.ts - 发起 Google OAuth 登录

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/auth';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const ctx = getRequestContext();
  const env = ctx.env as unknown as { GOOGLE_CLIENT_ID: string };
  const clientId = env.GOOGLE_CLIENT_ID;

  const host = request.headers.get('host') || '';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${proto}://${host}/api/auth/callback`;

  const url = getGoogleAuthUrl(clientId, redirectUri);
  return NextResponse.redirect(url);
}
