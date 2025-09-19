'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  PropsWithChildren
} from 'react';
import { useAccount, useDisconnect, useChainId } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { isInLiff, openExternalBrowser } from '@/lib/liffHelpers';

type Ctx = {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isInLiff: boolean;
};

const DappPortalContext = createContext<Ctx | null>(null);
const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1001);

export default function DappPortalProvider({ children }: PropsWithChildren) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [inLiff, setInLiff] = useState(false);

  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const currentChainId = useChainId();
  const { open } = useWeb3Modal();

  // Deteksi LIFF
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setInLiff(isInLiff());
  }, []);

  // Sinkron state address dari wagmi
  useEffect(() => {
    if (wagmiConnected && wagmiAddress) {
      const low = wagmiAddress.toLowerCase();
      setAddress(low);
      if (typeof window !== 'undefined') {
        localStorage.setItem('moreearn.lastAddress', low);
      }
    }
  }, [wagmiConnected, wagmiAddress]);

  // Restore address jika ada (untuk tampilan awal)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('moreearn.lastAddress');
    if (saved) setAddress(saved);
  }, []);

 const connect = useCallback(async () => {
  try {
    setIsConnecting(true);

     const openModal = (window as any).__W3M_OPEN__ as undefined | ((opts?: any) => Promise<void>);
    if (typeof openModal === 'function') {
      await openModal({ view: 'Connect' });
    } else {
      // fallback kalau entah kenapa modal belum attached
      const { open } = await import('@web3modal/wagmi/react').then(m => ({ open: m.useWeb3Modal().open }));
      await open();
    }

 // Jika LIFF sering blok deep link (terutama iOS), bantu user
    setTimeout(() => {
      // kalau address belum keisi setelah beberapa detik → tawarkan buka di browser eksternal
      const saved = localStorage.getItem('moreearn.lastAddress');
      if (inLiff && !saved) {
        const go = window.confirm(
          'WalletConnect mungkin diblok oleh WebView LINE.\nBuka di browser eksternal (Chrome/Safari) agar bisa connect?'
        );
        if (go) {
          import('@/lib/liffHelpers').then(({ openExternalBrowser }) => openExternalBrowser());
        }
      }
    }, 2000);
  } finally {
    setIsConnecting(false);
  }
}, [inLiff]);

  const disconnect = useCallback(async () => {
    try {
      await wagmiDisconnect();
    } finally {
      setAddress(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('moreearn.lastAddress');
      }
    }
  }, [wagmiDisconnect]);

  const ctx = useMemo<Ctx>(
    () => ({
      address,
      chainId: currentChainId ?? DEFAULT_CHAIN_ID,
      isConnecting,
      connect,
      disconnect,
      isInLiff: inLiff
    }),
    [address, currentChainId, isConnecting, connect, disconnect, inLiff]
  );

  return (
    <DappPortalContext.Provider value={ctx}>
      {children}
    </DappPortalContext.Provider>
  );
}

export function useDappPortal(): Ctx {
  const v = useContext(DappPortalContext);
  if (!v) throw new Error('useDappPortal must be used within <DappPortalProvider>');
  return v;
}
