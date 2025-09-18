// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

import { LiffProvider } from '@/components/LiffProvider';         // <- kalau kamu punya
import Web3ModalInit from '@/components/Web3ModalInit';           // <- default export
import DappPortalProvider from '@/components/DappPortalProvider';


const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'MORE Earn',
    template: '%s | MORE Earn',
  },
  description:
    'Simple USDT yield on Kaia with auto-compounding vault shares, missions, leaderboard, and Mini Dapp payment.',
  openGraph: {
    title: 'MORE Earn',
    description:
      'Simple USDT yield on Kaia with auto-compounding vault shares, missions, leaderboard, and Mini Dapp payment.',
    url: '/',
    siteName: 'MORE Earn',
    images: ['/og/cover.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og/cover.png'],
  },
  icons: { icon: '/brand/more.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Urutan penting: LIFF (opsional) -> Web3ModalInit (Wagmi/QueryClient) -> children */}
      <DappPortalProvider>
        <LiffProvider>
          <Web3ModalInit>{children}</Web3ModalInit>
        </LiffProvider>
          </DappPortalProvider>
      </body>
    </html>
  );
}
