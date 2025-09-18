'use client';

import React from 'react';
import { useDappPortal } from '@/components/DappPortalProvider';

// Tipe hasil context disamakan dengan useDappPortal agar kompatibel
export type HybridWalletContextValue = ReturnType<typeof useDappPortal>;

/**
 * Provider kosong: seluruh logika wallet (LIFF / Web3Modal)
 * sudah ditangani di DappPortalProvider. Ini hanya wrapper agar
 * API lama `useHybridWallet()` tetap bekerja.
 */
export function HybridWalletProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Hook kompatibilitas untuk pemanggil lama.
 * Proksi ke useDappPortal().
 */
export function useHybridWallet(): HybridWalletContextValue {
  return useDappPortal();
}

export default HybridWalletProvider;
