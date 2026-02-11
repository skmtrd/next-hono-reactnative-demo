import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Next.js + Hono Demo',
  description: 'A demo app showcasing Next.js frontend with Hono API backend',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
