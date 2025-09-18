'use client';

import React, { useEffect } from 'react';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { kairos } from '@/lib/chains';

// ── ENV ─────────────────────────────────────────────
const WC_PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();
if (typeof window !== 'undefined' && !WC_PROJECT_ID) {
  console.warn('NEXT_PUBLIC_WC_PROJECT_ID is empty. WalletConnect may not work.');
}

// ── Wagmi Config ───────────────────────────────────
const wagmiConfig = createConfig({
  chains: [kairos],
  transports: {
    [kairos.id]: http(kairos.rpcUrls.default.http[0]),
  },
});

const queryClient = new QueryClient();

export { wagmiConfig };

// ── Provider wrapper untuk seluruh app ─────────────
export default function Web3ModalInit({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (WC_PROJECT_ID && !(window as any).__W3M_INITIALIZED__) {
      createWeb3Modal({
        wagmiConfig,
        projectId: WC_PROJECT_ID,
        themeMode: 'dark',
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
