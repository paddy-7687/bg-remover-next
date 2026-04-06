import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '图片去背景 - 一键去除图片背景',
  description: '免费在线去除图片背景工具，由 Remove.bg AI 驱动，支持 JPG/PNG/WebP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
