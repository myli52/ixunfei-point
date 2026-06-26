import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '通勤距离速查 · 合肥',
  description:
    '输入任意地点作为参照中心，一眼看清合肥各地点到它的距离与远近排序，辅助选址与通勤决策。',
  keywords: ['合肥', '通勤', '距离', '选址', '地图'],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
