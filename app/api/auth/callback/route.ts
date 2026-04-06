// app/api/auth/callback/route.ts - Google OAuth 回调

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getGoogleProfile } from '@/lib/auth';
import { getOrCreateUser, createSession } from '@/lib/db';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }

  try {
    const ctx = getRequestContext();
    const db = ctx.env.DB as D1Database;
    const env = ctx.env as unknown as {
      GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;
    };

    const host = request.headers.get('host') || '';
    const proto = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${proto}://${host}/api/auth/callback`;

    const tokens = await exchangeCodeForTokens(
      code,
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const profile = await getGoogleProfile(tokens.access_token);
    const user = await getOrCreateUser(db, profile);
    const sessionId = await createSession(db, user.id);

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.set('session_id', sessionId, {
      httpOnly: true,
      secure: !host.includes('localhost'),
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30天
      path: '/',
    });
    return response;
  } catch (err) {
    console.error('Auth callback error:', err);
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }
}
