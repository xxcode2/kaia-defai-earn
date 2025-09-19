'use client';

import React from 'react';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { kaiaKairos } from '@/lib/chains';

const PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim();
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app';
const metadata = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'MORE Earn',
  description: process.env.NEXT_PUBLIC_APP_DESC || 'Earn USDT on Kaia',
  url: appUrl,
  icons: [`${appUrl}/brand/more.png`],
};

// --- Singleton di module scope (dievaluasi sekali per refresh halaman) ---
export const wagmiConfig = defaultWagmiConfig({
  chains: [kaiaKairos],
  projectId: PROJECT_ID,
  metadata,
});

// Hindari inisialisasi ganda (HMR/StrictMode/router mounts)
if (typeof window !== 'undefined' && !window.__W3M_INITIALIZED__) {
  if (PROJECT_ID) {
    const modal = createWeb3Modal({
      wagmiConfig,
      projectId: PROJECT_ID,
      themeMode: 'dark',
      enableAnalytics: false, // kurangi script eksternal
    });
    window.__W3M__ = modal;
    window.__W3M_OPEN__ = (opts?: any) => modal.open(opts);
    window.__W3M_CLOSE__ = () => modal.close();
    window.__W3M_INITIALIZED__ = true;
  } else {
    console.warn('NEXT_PUBLIC_WC_PROJECT_ID not set.');
  }
}

declare global {
  interface Window {
    __W3M__?: any;
    __W3M_OPEN__?: (opts?: any) => void;
    __W3M_CLOSE__?: () => void;
    __W3M_INITIALIZED__?: boolean;
  }
}

export default function Web3ModalInit({ children }: { children: React.ReactNode }) {
  // Tidak ada init di useEffect lagi -> mencegah double mount.
  return <>{children}</>;
}
