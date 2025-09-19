'use client';

import { ReactNode } from 'react';
import { WagmiProvider, http, createConfig } from 'wagmi';
import { kaiaKairos } from '@/lib/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { walletConnect, injected } from '@wagmi/connectors';

const projectId = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();

if (!projectId) {
  // biar kelihatan di dev kalau lupa isi env
  // (jangan melempar error di SSR)
  console.warn('NEXT_PUBLIC_WC_PROJECT_ID is empty – WalletConnect will not work.');
}

const metadata = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'MORE Earn',
  description: 'USDT yield on Kaia',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app',
  icons: [`${process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app'}/brand/more.png`],
};

const wagmiConfig = createConfig({
  ssr: false,
  chains: [kaiaKairos],
  transports: {
    [kaiaKairos.id]: http(kaiaKairos.rpcUrls.default.http[0])
  },
  connectors: [
    // WalletConnect v2 (utama untuk mobile wallets: Bitget/Trust/MetaMask mobile)
    walletConnect({ projectId, metadata, showQrModal: false }),
    // injected (hanya untuk desktop browser yang ada extension)
    injected({ shimDisconnect: true }),
  ],
});

const queryClient = new QueryClient();

export function WagmiProviders({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

// export untuk dipakai Web3ModalInit
export { wagmiConfig };
