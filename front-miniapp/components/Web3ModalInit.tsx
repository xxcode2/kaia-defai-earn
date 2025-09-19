// components/Web3ModalInit.tsx
'use client';

import { useEffect } from 'react';
import { WagmiProvider, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { kaiaKairos } from '@/lib/chains';

const PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app';
const metadata = {
  name: (process.env.NEXT_PUBLIC_APP_NAME || 'MORE Earn').replaceAll?.('"', '') || 'MORE Earn',
  description:
    (process.env.NEXT_PUBLIC_APP_DESC || 'USDT auto-compounding & missions on Kaia')
      .replaceAll?.('"', '') || 'MORE Earn',
  url: APP_URL,
  icons: [`${APP_URL}/brand/more.png`],
};

// Chains + transport
const chains = [kaiaKairos] as const;
const transports = {
  [kaiaKairos.id]: http(kaiaKairos.rpcUrls.default.http[0]),
} as const;

// wagmiConfig via helper Web3Modal v5 (tanpa perlu import connectors)
export const wagmiConfig = defaultWagmiConfig({
  projectId: PROJECT_ID,
  chains,
  transports,
  metadata,
  ssr: false,
});

// Singletons
const queryClient = new QueryClient();

export default function Web3ModalInit({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!PROJECT_ID) {
      console.warn('NEXT_PUBLIC_WC_PROJECT_ID is empty. WalletConnect may not work.');
      return;
    }
    // cegah init ganda
    if ((window as any).__W3M_INITIALIZED__) return;

    const modal = createWeb3Modal({
      wagmiConfig,
      projectId: PROJECT_ID,
      enableAnalytics: false,
      themeMode: 'dark',
    });

    // simpan helper ke window (opsional, berguna untuk LIFF)
    (window as any).__W3M__ = modal;
    (window as any).__W3M_OPEN__ = (opts?: any) => modal.open(opts);
    (window as any).__W3M_CLOSE__ = () => modal.close();
    (window as any).__W3M_INITIALIZED__ = true;
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
