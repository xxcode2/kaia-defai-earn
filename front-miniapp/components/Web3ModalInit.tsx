'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';
import { walletConnect } from 'wagmi/connectors';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { kairos } from '@/lib/chains';

const WC_PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();

const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app';
const metadata = {
  name: (process.env.NEXT_PUBLIC_APP_NAME || 'MORE Earn').replaceAll?.('"', '') || 'MORE Earn',
  description:
    (process.env.NEXT_PUBLIC_APP_DESC || 'USDT auto-compounding & missions on Kaia').replaceAll?.('"', '') ||
    'MORE Earn',
  url: appUrl,
  icons: [`${appUrl}/brand/more.png`]
};

export const wagmiConfig = createConfig({
  chains: [kairos],
  transports: { [kairos.id]: http(kairos.rpcUrls.default.http[0]) },
  connectors: [
    walletConnect({ projectId: WC_PROJECT_ID, metadata }),
    injected({ shimDisconnect: true })
  ],
  ssr: false
});

const queryClient = new QueryClient();
const projectId = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();

let w3mInitialized = false;
export default function Web3ModalInit({ children }: { children: React.ReactNode }) {
  if (typeof window !== 'undefined' && !w3mInitialized) {
    if (WC_PROJECT_ID) {
      // ⬇️ simpan instance modal ke window agar bisa dipanggil di LIFF
      const modal = createWeb3Modal({
        wagmiConfig,
        projectId: WC_PROJECT_ID,
        themeMode: 'dark',
        // opsional: bikin WalletConnect nongol jelas
        // enableOnramp: false,
      });
      (window as any).__W3M__ = modal;
      (window as any).__W3M_OPEN__ = (opts?: any) => modal.open(opts);
      (window as any).__W3M_CLOSE__ = () => modal.close();
        if ((window as any).__W3M_INITIALIZED__) return;
    (window as any).__W3M_INITIALIZED__ = true;
    } else {
      console.warn('NEXT_PUBLIC_WC_PROJECT_ID is empty. WalletConnect may not work.');
    }
    w3mInitialized = true;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
