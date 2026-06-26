import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '合肥地点通勤分析',
  description: '查看合肥地点分布与到隆昊昊天园的距离'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
