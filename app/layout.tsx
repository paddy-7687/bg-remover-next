import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '图片去背景',
  description: '一键去除图片背景',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
