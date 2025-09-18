// app/layout.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import type { Metadata } from 'next';
import './globals.css';

import Web3ModalInit from '@/components/Web3ModalInit';           // ⬅️ PROVIDER wagmi + Web3Modal
import { HybridWalletProvider } from '@/components/HybridWalletContext'; // ⬅️ Switch LIFF vs Browser
import DappPortalProvider from '@/components/DappPortalProvider';  // (client) aman asalkan tak panggil useWeb3Modal
import { LiffProvider } from '@/components/LiffProvider';          // (client) jangan panggil useWeb3Modal di sini

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
        {/* Urutan penting:
            1) (opsional) provider lain
            2) Web3ModalInit -> memasang WagmiProvider + inisialisasi Web3Modal
            3) HybridWalletProvider -> memilih LIFF (Mini Dapp SDK) atau Browser (wagmi) */}
        <DappPortalProvider>
          <LiffProvider>
            <Web3ModalInit>
              <HybridWalletProvider>
                {children}
              </HybridWalletProvider>
            </Web3ModalInit>
          </LiffProvider>
        </DappPortalProvider>
      </body>
    </html>
  );
}
