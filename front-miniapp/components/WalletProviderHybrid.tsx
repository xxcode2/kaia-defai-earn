// front-miniapp/components/WalletProviderHybrid.tsx
'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { isLiffEnv, isLikelyBlockedWebview } from '@/lib/env';
import DappPortalSDK from '@linenext/dapp-portal-sdk';
import { Web3Provider as KaiaWeb3Provider } from '@kaiachain/ethers-ext'; // optional if you need
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { kaiaKairos } from '@/lib/chains';

const WC_PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();
const CLIENT_ID = (process.env.NEXT_PUBLIC_MINIDAPP_CLIENT_ID || '').trim();
const CHAIN_ID = (process.env.NEXT_PUBLIC_CHAIN_ID || '1001').toString();
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app';

export default function WalletProviderHybrid({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [isLiff, setIsLiff] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;

      const inLiff = isLiffEnv();
      setIsLiff(inLiff);

      if (inLiff && CLIENT_ID) {
        // === LIFF / Mini Dapp path ===
        try {
          // Init DappPortal SDK once
          const sdk = await DappPortalSDK.init({
            clientId: CLIENT_ID,
            chainId: CHAIN_ID
          });

          // get wallet provider (EIP-1193)
          const provider = sdk.getWalletProvider?.();
          if (provider) {
            // attach provider to window.ethereum so existing connect code still works
            // NOTE: we try to be non-destructive: only set if not present
            if (typeof (window as any).ethereum === 'undefined') {
              // the provider from MiniDapp should implement request(), on(), removeListener() etc.
              (window as any).ethereum = provider;
            } else {
              // if present, create small proxy to forward requests to mini provider for eth_requestAccounts
              const prev = (window as any).ethereum;
              (window as any).__MINIDAPP_PROVIDER__ = provider;
              // keep prev available
            }
            // also store sdk & provider for debug
            (window as any).__MINIDAPP_SDK__ = sdk;
            (window as any).__MINIDAPP_PROVIDER__ = provider;
          } else {
            console.warn('MiniDapp SDK initialized but getWalletProvider returned no provider');
          }
        } catch (err) {
          console.warn('DappPortalSDK init failed', err);
        } finally {
          setInitializing(false);
        }
        return;
      }

      // === Browser path: init Web3Modal once ===
      try {
        if (WC_PROJECT_ID && !(window as any).__W3M_INITIALIZED__) {
          const wagmiConfig = defaultWagmiConfig({
            chains: [kaiaKairos],
            projectId: WC_PROJECT_ID,
            metadata: {
              name: process.env.NEXT_PUBLIC_APP_NAME || 'MORE Earn',
              description: process.env.NEXT_PUBLIC_APP_DESC || '',
              url: SITE_URL,
              icons: [`${SITE_URL}/brand/more.png`]
            }
          });
          const modal = createWeb3Modal({
            wagmiConfig,
            projectId: WC_PROJECT_ID,
            themeMode: 'dark'
          });
          // expose helpers (used by other parts)
          (window as any).__W3M__ = modal;
          (window as any).__W3M_OPEN__ = (opts?: any) => modal.open(opts);
          (window as any).__W3M_CLOSE__ = () => modal.close();
          (window as any).__W3M_INITIALIZED__ = true;
        }
      } catch (e) {
        console.warn('Web3Modal init failed', e);
      } finally {
        setInitializing(false);
      }
    })();
    return () => {
      // cleanup
      (mounted = false);
    };
  }, []);

  // If in LIFF and likely blocked webview, show UX hint (component consumer can check window.__MINIDAPP_PROVIDER__)
  if (initializing) {
    return <div className="p-4">⏳ Initializing wallet bridge…</div>;
  }

  return <>{children}</>;
}
