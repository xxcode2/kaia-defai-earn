// components/WalletProviderHybrid.tsx
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { isLiffEnv } from '@/lib/env';
import DappPortalSDK from '@linenext/dapp-portal-sdk';
import { Web3Provider } from '@kaiachain/ethers-ext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiConfig } from 'wagmi';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { kaiaKairos } from '@/lib/chains';

const WC_PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();
const CLIENT_ID = process.env.NEXT_PUBLIC_MINIDAPP_CLIENT_ID || '';
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '1001';
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app';

const metadata = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'MORE Earn',
  description: process.env.NEXT_PUBLIC_APP_DESC || 'Earn USDT on Kaia',
  url: appUrl,
  icons: [`${appUrl}/brand/more.png`],
};

const queryClient = new QueryClient();

export default function WalletProviderHybrid({ children }: { children: ReactNode }) {
  const [isLiff, setIsLiff] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLiffEnv()) {
      setIsLiff(true);
      (async () => {
        try {
          if (!CLIENT_ID) {
            setReady(true);
            return;
          }
          const sdk = await DappPortalSDK.init({
            clientId: CLIENT_ID,
            chainId: CHAIN_ID,
          });
          (window as any).DAPP_PORTAL_SDK = sdk;
          (window as any).DAPP_PORTAL_PROVIDER = new Web3Provider(sdk.getWalletProvider());
        } catch (e) {
          console.warn('MiniDapp init failed', e);
        } finally {
          setReady(true);
        }
      })();
    } else {
      setReady(true);
    }
  }, []);

  if (isLiff && !ready) {
    return <div className="p-4">⏳ Initializing MiniDapp…</div>;
  }

  const wagmiConfig = defaultWagmiConfig({
    chains: [kaiaKairos],
    projectId: WC_PROJECT_ID,
    metadata,
  });

  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiConfig>
  );
}
