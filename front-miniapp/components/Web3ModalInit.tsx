'use client';

import { createWeb3Modal } from '@web3modal/wagmi/react';
import { http, createConfig } from 'wagmi';
import { kairos } from '@/lib/chains'; // chain Kairos yang sudah kamu buat

const PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app';

// wagmi config minimal (boleh pakai yg sudah kamu punya; yang penting object-nya exist)
export const wagmiConfig = createConfig({
  chains: [kairos],
  transports: {
    [kairos.id]: http(kairos.rpcUrls.default.http[0]),
  },
});

/**
 * PANGGIL SEKALI di level modul (bukan di dalam komponen).
 * Ini aman dipanggil saat SSR build karena tidak butuh `window`.
 */
if (PROJECT_ID) {
  try {
    createWeb3Modal({
      wagmiConfig,
      projectId: PROJECT_ID,
      chains: [kairos],
      metadata: {
        name: 'MORE Earn',
        description: 'USDT vault on Kaia (Mini Dapp)',
        url: SITE_URL,
        icons: [`${SITE_URL}/brand/more.png`],
      },
      // optional: themeMode: 'dark',
    });
  } catch {
    // Jika di-reimport beberapa kali, SDK akan lempar error duplikat.
    // Di sini kita diamkan saja agar tidak memblok build.
  }
}

/** Komponen dummy — cukup di-render supaya file ini terimport. */
export default function Web3ModalInit() {
  return null;
}
