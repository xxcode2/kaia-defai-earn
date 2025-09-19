// app/layout.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import type { Metadata } from 'next';
import './globals.css';
import NextDynamic from 'next/dynamic';

const Web3ModalInit = NextDynamic(() => import('@/components/Web3ModalInit'), { ssr: false });
const DappPortalProvider = NextDynamic(() => import('@/components/DappPortalProvider'), { ssr: false });
const LiffProvider = NextDynamic(() => import('@/components/LiffProvider'), { ssr: false });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'MORE Earn', template: '%s | MORE Earn' },
  description:
    'Simple USDT yield on Kaia with auto-compounding vault shares, missions, leaderboard, and Mini Dapp payment.',
  openGraph: {
    title: 'MORE Earn',
    description:
      'Simple USDT yield on Kaia with auto-compounding vault shares, missions, leaderboard, and Mini Dapp payment.',
    url: '/',
    siteName: 'MORE Earn',
    images: ['/og/cover.png'],
    type: 'website'
  },
  twitter: { card: 'summary_large_image', images: ['/og/cover.png'] },
  icons: { icon: '/brand/more.png' }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <LiffProvider>
          <Web3ModalInit>
            <DappPortalProvider>{children}</DappPortalProvider>
          </Web3ModalInit>
        </LiffProvider>
      </body>
    </html>
  );
}
