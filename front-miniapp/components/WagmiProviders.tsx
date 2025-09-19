'use client';

import { ReactNode } from 'react';
import { WagmiProvider, http, createConfig } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { walletConnect, injected } from '@wagmi/connectors';
import { kaiaKairos } from '@/lib/chains';

const PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app';

// metadata untuk WalletConnect (wajib ada icon & url valid)
const metadata = {
  name: 'MORE Earn',
  description: 'USDT auto-compounding & missions on Kaia',
  url: SITE_URL,
  icons: [`${SITE_URL}/brand/more.png`]
};

// Wagmi config (v2)
export const wagmiConfig = createConfig({
  chains: [kaiaKairos],
  transports: {
    [kaiaKairos.id]: http(kaiaKairos.rpcUrls.default.http[0])
  },
  connectors: [
    walletConnect({
      projectId: PROJECT_ID,
      metadata
    }),
    injected({ shimDisconnect: true })
  ],
  ssr: false
});

const queryClient = new QueryClient();

export default function WagmiProviders({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
