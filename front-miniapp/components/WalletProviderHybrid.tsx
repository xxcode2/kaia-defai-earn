'use client';

import { ReactNode, useEffect, useState } from 'react';
import { isLiffEnv } from '@/lib/env';
import DappPortalSDK from '@linenext/dapp-portal-sdk';
import { Web3Provider } from '@kaiachain/ethers-ext';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { kairos } from '@/lib/chains';

const WC_PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();
const CLIENT_ID = process.env.NEXT_PUBLIC_MINIDAPP_CLIENT_ID || ''; // dari Kaia portal
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '1001';

// metadata buat WalletConnect
const metadata = {
  name: (process.env.NEXT_PUBLIC_APP_NAME || 'MORE Earn').replaceAll('"',''),
  description: (process.env.NEXT_PUBLIC_APP_DESC || '').replaceAll('"',''),
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app',
  icons: [`${process.env.NEXT_PUBLIC_SITE_URL}/brand/more.png`],
};

// wagmi config (untuk browser)
const wagmiConfig = defaultWagmiConfig({
  chains: [kairos],
  projectId: WC_PROJECT_ID,
  metadata,
});

const queryClient = new QueryClient();

export default function WalletProviderHybrid({ children }: { children: ReactNode }) {
  const [isLiff, setIsLiff] = useState(false);
  const [dappPortal, setDappPortal] = useState<any>(null);

  useEffect(() => {
    if (isLiffEnv()) {
      setIsLiff(true);

      // inisialisasi Mini Dapp SDK
      (async () => {
        const sdk = await DappPortalSDK.init({
          clientId: CLIENT_ID,
          chainId: CHAIN_ID,
        });
        const provider = new Web3Provider(sdk.getWalletProvider());
        setDappPortal({ sdk, provider });
      })();
    } else {
      // init Web3Modal sekali
      if (WC_PROJECT_ID && !(window as any).__W3M_INITIALIZED__) {
        createWeb3Modal({
          wagmiConfig,
          projectId: WC_PROJECT_ID,
          themeMode: 'dark',
        });
        (window as any).__W3M_INITIALIZED__ = true;
      }
    }
  }, []);

  if (isLiff) {
    // Provider LIFF (Mini Dapp SDK)
    if (!dappPortal) {
      return <div className="p-4">⏳ Initializing Mini Dapp SDK…</div>;
    }
    // provider dappPortal bisa dipass via context kalau perlu
    return <>{children}</>;
  }

  // Provider browser (Web3Modal + Wagmi)
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
