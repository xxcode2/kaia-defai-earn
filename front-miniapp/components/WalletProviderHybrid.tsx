// components/WalletProviderHybrid.tsx
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { isLiffEnv } from '@/lib/env';
import DappPortalSDK from '@linenext/dapp-portal-sdk';
import { Web3Provider } from '@kaiachain/ethers-ext';
import { WagmiProvider, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { kaiaKairos } from '@/lib/chains'; // <-- ganti: pakai kaiaKairos

const WC_PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();
const CLIENT_ID = process.env.NEXT_PUBLIC_MINIDAPP_CLIENT_ID || ''; // dari Kaia portal
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '1001';

// metadata buat WalletConnect
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app';
const metadata = {
  name: (process.env.NEXT_PUBLIC_APP_NAME || 'MORE Earn').replaceAll?.('"', ''),
  description: (process.env.NEXT_PUBLIC_APP_DESC || 'USDT auto-compounding & missions on Kaia').replaceAll?.('"', ''),
  url: APP_URL,
  icons: [`${APP_URL}/brand/more.png`],
};

// wagmi config (untuk browser)
const chains = [kaiaKairos] as const;
const transports = {
  [kaiaKairos.id]: http(kaiaKairos.rpcUrls.default.http[0]),
} as const;

const wagmiConfig = defaultWagmiConfig({
  projectId: WC_PROJECT_ID,
  chains,
  transports,   // penting untuk custom chain
  metadata,
  ssr: false
});

const queryClient = new QueryClient();

export default function WalletProviderHybrid({ children }: { children: React.ReactNode }) {
  const [isLiff, setIsLiff] = useState(false);
  const [dappPortal, setDappPortal] = useState<any>(null);

  useEffect(() => {
    if (isLiffEnv()) {
      setIsLiff(true);

      // inisialisasi Mini Dapp SDK (LIFF)
      (async () => {
        const sdk = await DappPortalSDK.init({
          clientId: CLIENT_ID,
          chainId: CHAIN_ID,
        });
        const provider = new Web3Provider(sdk.getWalletProvider());
        setDappPortal({ sdk, provider });
      })();
    } else {
      // init Web3Modal sekali untuk browser biasa
      if (WC_PROJECT_ID && !(window as any).__W3M_INITIALIZED__) {
        const modal = createWeb3Modal({
          wagmiConfig,
          projectId: WC_PROJECT_ID,
          themeMode: 'dark',
          enableAnalytics: false
        });
        (window as any).__W3M__ = modal;
        (window as any).__W3M_OPEN__ = (opts?: any) => modal.open(opts);
        (window as any).__W3M_CLOSE__ = () => modal.close();
        (window as any).__W3M_INITIALIZED__ = true;
      }
    }
  }, []);

  if (isLiff) {
    // Provider LIFF (Mini Dapp SDK)
    if (!dappPortal) {
      return <div className="p-4">⏳ Initializing Mini Dapp SDK…</div>;
    }
    // TODO: kalau perlu, teruskan provider sdk via context.
    return <>{children}</>;
  }

  // Provider browser (Web3Modal + Wagmi)
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
