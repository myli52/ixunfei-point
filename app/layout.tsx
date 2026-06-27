import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import './globals.css';

// 产品字标专用字体：几何无衬线，利落有设计感
const sora = Sora({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-brand',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Point · 合肥通勤距离速查',
  description:
    '输入任意地点作为参照中心，一眼看清合肥各地点到它的距离与远近排序，辅助选址与通勤决策。',
  keywords: ['合肥', '通勤', '距离', '选址', '地图', 'Point'],
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
    <html lang="zh-CN" className={sora.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
