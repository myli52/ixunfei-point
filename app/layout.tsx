import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '合肥通勤地图 - 智能选址工具',
  description: '查看合肥各地点到目标小区的距离，帮助您做出更明智的通勤选择',
  keywords: ['合肥', '通勤', '地图', '距离计算', '选址'],
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
