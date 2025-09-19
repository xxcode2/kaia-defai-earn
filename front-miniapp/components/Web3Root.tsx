// components/Web3Root.tsx
'use client';

import { useEffect, useState } from 'react';
import { WagmiProvider, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { kaiaKairos, kaiaMainnet } from '@/lib/chains';

const PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();
const ENV_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1001);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app';
const metadata = {
  name: (process.env.NEXT_PUBLIC_APP_NAME || 'MORE Earn').replaceAll?.('"', '') || 'MORE Earn',
  description:
    (process.env.NEXT_PUBLIC_APP_DESC || 'USDT auto-compounding & missions on Kaia')
      .replaceAll?.('"', '') || 'MORE Earn',
  url: SITE_URL,
  icons: [`${SITE_URL}/brand/more.png`],
};

// pilih chain aktif dari env
const activeChain = ENV_CHAIN_ID === 8217 ? kaiaMainnet : kaiaKairos;
const chains = [activeChain] as const;
const transports = {
  [activeChain.id]: http(activeChain.rpcUrls.default.http[0]),
} as const;

// buat wagmi config
const wagmiConfig = defaultWagmiConfig({
  projectId: PROJECT_ID,
  chains,
  transports,
  metadata,
  ssr: false
});

const queryClient = new QueryClient();

export default function Web3Root({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!PROJECT_ID) {
      console.warn('NEXT_PUBLIC_WC_PROJECT_ID is empty. WalletConnect may not work.');
      return;
    }
    if ((window as any).__W3M_INITIALIZED__) {
      setReady(true);
      return;
    }

    const modal = createWeb3Modal({
      wagmiConfig,
      projectId: PROJECT_ID,
      enableAnalytics: false,
      themeMode: 'dark'
    });

    // expose helper global agar tombol bisa buka modal tanpa hook
    (window as any).__W3M__ = modal;
    (window as any).__W3M_OPEN__ = (opts?: any) => modal.open(opts);
    (window as any).__W3M_CLOSE__ = () => modal.close();
    (window as any).__W3M_INITIALIZED__ = true;

    setReady(true);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* Bisa render anak2 sekalipun ready false, 
            tapi tombol connect akan ngecek flag global */}
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
