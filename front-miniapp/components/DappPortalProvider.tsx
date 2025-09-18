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
import { initMini, getMiniDapp } from '@/lib/miniDapp';

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
  const [isInLiff, setIsInLiff] = useState(false);

  // wagmi states (sudah disediakan oleh Web3ModalInit di layout)
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const currentChainId = useChainId();

  const { open } = useWeb3Modal();

  // Detect LIFF (best-effort)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    const inLiff = /Line/i.test(ua) || window.location.host.includes('liff.line.me');
    setIsInLiff(inLiff);
  }, []);

  // Init MiniDapp SDK (tidak mengganggu web)
  useEffect(() => {
    initMini().catch(() => {});
  }, []);

  // Sinkronkan state address dengan wagmi
  useEffect(() => {
    if (wagmiConnected && wagmiAddress) {
      const low = wagmiAddress.toLowerCase();
      setAddress(low);
      if (typeof window !== 'undefined') {
        localStorage.setItem('moreearn.lastAddress', low);
      }
    }
  }, [wagmiConnected, wagmiAddress]);

  // Restore address jika ada (hanya sebagai tampilan awal)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('moreearn.lastAddress');
    if (saved) setAddress(saved);
  }, []);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);

      if (isInLiff) {
        // LIFF Mini Dapp connect
        const sdk = getMiniDapp();
        const res = await sdk.connectWallet();
        const addr = res?.address?.toLowerCase?.() || '';
        if (addr) {
          setAddress(addr);
          if (typeof window !== 'undefined') {
            localStorage.setItem('moreearn.lastAddress', addr);
          }
          return;
        }
        // fallback ke modal jika mini dapp gagal/ditolak
      }

      // Browser: buka Web3Modal
      await open();
      // Alamat akan tersinkron lewat wagmi effect di atas
    } finally {
      setIsConnecting(false);
    }
  }, [isInLiff, open]);

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
      isInLiff
    }),
    [address, currentChainId, isConnecting, connect, disconnect, isInLiff]
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
