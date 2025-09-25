import type { Metadata } from 'next'
import './globals.css'
import Web3Providers from '@/components/Web3Providers'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'MORE Earn', template: '%s | MORE Earn' },
  description: 'USDT yield + Swap (multi-chain EVM)',
  openGraph: { title: 'MORE Earn', url: '/', images: ['/og/cover.png'] }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Web3Providers>{children}</Web3Providers>
      </body>
    </html>
  )
}
