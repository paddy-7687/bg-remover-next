// app/api/remove-bg/route.ts - 去背景核心接口（带用量控制）

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getSessionIdFromRequest } from '@/lib/auth';
import { checkAndConsumeCredit } from '@/lib/db';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const ctx = getRequestContext();
    const db = ctx.env.DB as D1Database;
    const env = ctx.env as unknown as { REMOVE_BG_API_KEY: string };

    // 获取当前用户
    const sessionId = getSessionIdFromRequest(request);
    const user = await getCurrentUser(db, sessionId);

    // 获取 IP
    const ip = request.headers.get('cf-connecting-ip') ||
                request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                '0.0.0.0';

    // 检查用量
    const creditCheck = await checkAndConsumeCredit(db, user?.id || null, ip);
    if (!creditCheck.allowed) {
      const messages: Record<string, string> = {
        ip_limit: '今日免费次数已用完，登录后每月可使用3次',
        free_limit: '本月免费次数已用完，升级 Pro 可每月使用50次',
        pro_limit: '本月 Pro 次数已用完，下月自动恢复',
        user_not_found: '用户不存在，请重新登录',
      };
      return NextResponse.json(
        { error: messages[creditCheck.reason || ''] || '额度已用完', reason: creditCheck.reason, needUpgrade: true },
        { status: 429 }
      );
    }

    // 处理图片
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    if (!imageFile) {
      return NextResponse.json({ error: '请上传图片' }, { status: 400 });
    }

    const apiKey = env.REMOVE_BG_API_KEY;
    const removeBgForm = new FormData();
    removeBgForm.append('image_file', imageFile);
    removeBgForm.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: removeBgForm,
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'X-Credits-Remaining': String(creditCheck.remaining ?? ''),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '处理失败' },
      { status: 500 }
    );
  }
}
