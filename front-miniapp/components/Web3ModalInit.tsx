'use client';

import { useEffect } from 'react';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { kairos } from '@/lib/chains';

// — ENV
const WC_PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();
if (typeof window !== 'undefined' && !WC_PROJECT_ID) {
  console.warn('NEXT_PUBLIC_WC_PROJECT_ID is empty. WalletConnect may not work.');
}

// — Metadata (wajib untuk WalletConnect registry)
const metadata = {
  name: process.env.NEXT_PUBLIC_APP_NAME?.replaceAll('"','') || 'MORE Earn',
  description: process.env.NEXT_PUBLIC_APP_DESC?.replaceAll('"','') || 'USDT auto-compounding & missions on Kaia',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app',
  icons: [`${process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app'}/brand/more.png`],
};

// — Wagmi config (pakai defaultWagmiConfig -> sudah include WalletConnect connector)
export const wagmiConfig = defaultWagmiConfig({
  chains: [kairos],            // chain custom kamu
  projectId: WC_PROJECT_ID,    // WalletConnect v2 Project ID
  metadata,                    // penting untuk mobile deep-link
  // optional:
  // enableCoinbase: false,
  // enableInjected: true,
  // enableEIP6963: true
});

const queryClient = new QueryClient();

export default function Web3ModalInit({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (WC_PROJECT_ID && !(window as any).__W3M_INITIALIZED__) {
      createWeb3Modal({
        wagmiConfig,
        projectId: WC_PROJECT_ID,
        themeMode: 'dark',
        // optional: tampilkan beberapa wallet di atas
        // featuredWalletIds: ['metamask','trust','okx','bitget'],
      });
      (window as any).__W3M_INITIALIZED__ = true;
    }
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
