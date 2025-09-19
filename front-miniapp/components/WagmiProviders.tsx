'use client';

import { ReactNode } from 'react';
import { WagmiProvider, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { kaiaKairos } from '@/lib/chains';

const PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app';

// metadata untuk WalletConnect (harus url & icon valid)
const metadata = {
  name: 'MORE Earn',
  description: 'USDT auto-compounding & missions on Kaia',
  url: SITE_URL,
  icons: [`${SITE_URL}/brand/more.png`]
};

// chains + transports
const chains = [kaiaKairos] as const;
const transports = {
  [kaiaKairos.id]: http(kaiaKairos.rpcUrls.default.http[0])
} as const;

// Buat wagmiConfig via helper resmi Web3Modal v5
export const wagmiConfig = defaultWagmiConfig({
  projectId: PROJECT_ID,
  chains,
  transports,
  metadata,
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
