'use client';

import React, { useEffect } from 'react';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { kaiaKairos } from '@/lib/chains';

const WC_PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app';

const metadata = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'MORE Earn',
  description: process.env.NEXT_PUBLIC_APP_DESC || 'Earn USDT on Kaia',
  url: appUrl,
  icons: [`${appUrl}/brand/more.png`],
};

/** ⬇️ Diekspor supaya bisa dipakai di module lain (lib/wallet.ts, dll.) */
export const wagmiConfig = defaultWagmiConfig({
  chains: [kaiaKairos],
  projectId: WC_PROJECT_ID,
  metadata,
});

export default function Web3ModalInit({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).__W3M_INITIALIZED__) return;

    if (WC_PROJECT_ID) {
      const modal = createWeb3Modal({
        wagmiConfig,
        projectId: WC_PROJECT_ID,
        themeMode: 'dark',
      });
      (window as any).__W3M__ = modal;
      (window as any).__W3M_OPEN__ = (opts?: any) => modal.open(opts);
      (window as any).__W3M_CLOSE__ = () => modal.close();
      (window as any).__W3M_INITIALIZED__ = true;
    } else {
      console.warn('NEXT_PUBLIC_WC_PROJECT_ID not set.');
    }
  }, []);

  return <>{children}</>;
}
