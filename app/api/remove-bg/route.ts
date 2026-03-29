import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 30;

// Fallback API key for Cloudflare Pages deployment
const FALLBACK_API_KEY = 'Xi2rotaGKU6hqz3hGgRd3q6v';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: '请上传图片' }, { status: 400 });
    }

    const apiKey = process.env.REMOVE_BG_API_KEY || FALLBACK_API_KEY;

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
      headers: { 'Content-Type': 'image/png' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '处理失败' },
      { status: 500 }
    );
  }
}
