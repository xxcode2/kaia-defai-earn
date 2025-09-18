'use client';

import { useEffect } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';
import { walletConnect } from 'wagmi/connectors';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { kairos } from '@/lib/chains';

const WC_PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();
if (typeof window !== 'undefined' && !WC_PROJECT_ID) {
  console.warn('NEXT_PUBLIC_WC_PROJECT_ID is empty. WalletConnect may not work.');
}

// metadata penting untuk deep-link WalletConnect
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app';
const metadata = {
  name: (process.env.NEXT_PUBLIC_APP_NAME || 'MORE Earn').replaceAll('"',''),
  description: (process.env.NEXT_PUBLIC_APP_DESC || 'USDT auto-compounding & missions on Kaia').replaceAll('"',''),
  url: appUrl,
  icons: [`${appUrl}/brand/more.png`],
};

// Wagmi config: tambahkan connector WalletConnect + Injected
const wagmiConfig = createConfig({
  chains: [kairos],
  transports: {
    [kairos.id]: http(kairos.rpcUrls.default.http[0]),
  },
  connectors: [
    walletConnect({
      projectId: WC_PROJECT_ID,
      metadata,             // supaya OKX/Bitget/MetaMask Mobile dapat context app
      // optional:
      // relayUrl: 'wss://relay.walletconnect.com',
      // qrModalOptions: { themeMode: 'dark' }
    }),
    injected({
      shimDisconnect: true, // biar tombol disconnect bekerja lebih stabil
    }),
  ],
});

const queryClient = new QueryClient();

export default function Web3ModalInit({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!WC_PROJECT_ID) return;
    if ((window as any).__W3M_INITIALIZED__) return;

    createWeb3Modal({
      wagmiConfig,
      projectId: WC_PROJECT_ID,
      themeMode: 'dark',
      // optional: tonjolkan wallet yang kamu mau
      // featuredWalletIds: ['metamask', 'okx', 'trust', 'bitget'],
    });

    (window as any).__W3M_INITIALIZED__ = true;
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export { wagmiConfig };
