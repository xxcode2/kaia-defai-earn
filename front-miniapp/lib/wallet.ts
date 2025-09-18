// lib/wallet.ts
'use client';

/**
 * Util wallet berbasis wagmi v2.
 * - Gunakan untuk BACA state wallet (alamat, status, chain) dan DISCONNECT.
 * - Untuk CONNECT, gunakan modal: `const { open } = useWeb3Modal(); open();`
 */

import type { Hex } from 'viem';
import {
  getAccount,
  watchAccount,
  disconnect as wagmiDisconnect,
  getChainId
} from 'wagmi/actions';

import { wagmiConfig } from '@/components/Web3ModalInit'; // pastikan ini export wagmiConfig

/** Snapshot status wallet saat ini. */
export type WalletSnapshot = {
  /** 'connected' | 'reconnecting' | 'connecting' | 'disconnected' */
  status: 'connected' | 'reconnecting' | 'connecting' | 'disconnected';
  /** Alamat EVM checksum, jika ada */
  address: Hex | null;
  /** Chain ID saat ini (mis. 1001 untuk Kairos), jika tersedia */
  chainId: number | null;
  /** Apakah sudah terhubung */
  isConnected: boolean;
};

/** Ambil snapshot wallet sekarang (tanpa memicu koneksi). */
export function getWalletSnapshot(): WalletSnapshot {
  const acc = getAccount(wagmiConfig);
  let chainId: number | null = null;
  try {
    chainId = getChainId(wagmiConfig);
  } catch {
    chainId = null;
  }

  return {
    status: acc.status,
    address: (acc.address as Hex) ?? null,
    chainId,
    isConnected: acc.status === 'connected'
  };
}

/**
 * Berlangganan perubahan wallet (address/status/chain).
 * Return fungsi unsubscribe.
 *
 * Contoh:
 * const un = onWalletChange((snap) => console.log(snap));
 * // ...
 * un();
 */
export function onWalletChange(
  cb: (snapshot: WalletSnapshot) => void
): () => void {
  return watchAccount(wagmiConfig, {
    onChange() {
      cb(getWalletSnapshot());
    }
  });
}

/** Putuskan koneksi wallet (menutup sesi WalletConnect jika ada). */
export async function disconnectWallet(): Promise<void> {
  try {
    await wagmiDisconnect(wagmiConfig);
  } catch (e) {
    // sebagian wallet bisa menolak; diamkan saja
    console.warn('disconnectWallet error:', e);
  }
}

/**
 * (Deprecated) Connect wallet.
 * Jangan pakai fungsi ini — gunakan modal:
 *
 *  const { open } = useWeb3Modal();
 *  await open();
 */
export async function connectWalletDeprecated(): Promise<never> {
  throw new Error(
    'Gunakan useWeb3Modal().open() untuk connect. lib/wallet.ts hanya util baca & disconnect.'
  );
}
