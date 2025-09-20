'use client';

import React from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected, walletConnect } from 'wagmi/connectors';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { kaiaKairos } from '@/lib/chains';

const PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app';

const metadata = {
  name: (process.env.NEXT_PUBLIC_APP_NAME || 'MORE Earn').replaceAll?.('"', '') || 'MORE Earn',
  description:
    (process.env.NEXT_PUBLIC_APP_DESC || 'USDT auto-compounding & missions on Kaia').replaceAll?.('"', '') ||
    'MORE Earn',
  url: appUrl,
  icons: [`${appUrl}/brand/more.png`],
};

// ── Wagmi config: injected DIDAHULUKAN, lalu WalletConnect
export const wagmiConfig = createConfig({
  chains: [kaiaKairos],
  transports: { [kaiaKairos.id]: http(kaiaKairos.rpcUrls.default.http[0]) },
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({ projectId: PROJECT_ID, metadata })
  ],
  ssr: false
});

const queryClient = new QueryClient();

// ── Singleton init modal (hindari double init)
declare global {
  interface Window {
    __W3M__?: any;
    __W3M_OPEN__?: (opts?: any) => void;
    __W3M_CLOSE__?: () => void;
    __W3M_INITIALIZED__?: boolean;
  }
}

if (typeof window !== 'undefined' && !window.__W3M_INITIALIZED__) {
  if (PROJECT_ID) {
    const modal = createWeb3Modal({
      wagmiConfig,
      projectId: PROJECT_ID,
      themeMode: 'dark',
      // Matikan Auth/SSO supaya tidak ganggu di mobile wallet browsers
      // (untuk Web3Modal v5 gunakan enableAuth; untuk AppKit baru gunakan auth:{ email:false, socials:[] })
      // @ts-ignore
      enableAuth: false,
      enableAnalytics: false
    });
    window.__W3M__ = modal;
    window.__W3M_OPEN__ = (opts?: any) => modal.open(opts);
    window.__W3M_CLOSE__ = () => modal.close();
    window.__W3M_INITIALIZED__ = true;
  } else {
    console.warn('NEXT_PUBLIC_WC_PROJECT_ID not set.');
  }
}

export default function Web3ModalInit({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
