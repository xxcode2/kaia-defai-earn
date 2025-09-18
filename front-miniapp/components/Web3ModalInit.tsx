'use client';

import React, { useEffect } from 'react';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { kairos } from '@/lib/chains';


// ── ENV ─────────────────────────────────────────────────────────────────
const REOWN_PROJECT_ID =
  (process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '').trim(); // <— pastikan terisi
if (typeof window !== 'undefined' && !REOWN_PROJECT_ID) {
  console.warn('NEXT_PUBLIC_REOWN_PROJECT_ID is empty. WalletConnect may not work.');
}

// ── Wagmi + Query Client ───────────────────────────────────────────────
const wagmiConfig = createConfig({
  chains: [kairos],
  transports: {
    [kairos.id]: http(kairos.rpcUrls.default.http[0]),
  },
});

const queryClient = new QueryClient();

export { wagmiConfig };

// ── Provider wrapper untuk seluruh app ─────────────────────────────────
export default function Web3ModalInit({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (REOWN_PROJECT_ID) {
      createWeb3Modal({
        wagmiConfig,
        projectId: REOWN_PROJECT_ID,
        themeMode: 'dark',
      });
    }
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}