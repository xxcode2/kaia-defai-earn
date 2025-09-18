'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, PropsWithChildren } from 'react';
import { useAccount, useDisconnect } from 'wagmi'
import { useWeb3Modal } from '@web3modal/wagmi/react'
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
const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || '';

export default function DappPortalProvider({ children }: PropsWithChildren) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(DEFAULT_CHAIN_ID);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInLiff, setIsInLiff] = useState(false);

  const wagmiReadyRef = useRef(false);
  const wagmiConnectRef = useRef<null | (() => Promise<string | null>)>(null);
  const wagmiDisconnectRef = useRef<null | (() => Promise<void>)>(null);

  // Detect LIFF (best-effort)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsInLiff(window.location.host.includes('liff.line.me'));
  }, []);

  // Init MiniDapp shim (for LIFF)
  useEffect(() => {
    initMini().catch(() => {});
  }, []);

  // Lazy-init Web3Modal + Wagmi only in the browser
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof window === 'undefined') return;
      if (!WC_PROJECT_ID) return; // skip if not configured

      // Dynamically import to avoid SSR bundling errors

      const { http, createConfig } = await import('wagmi');
      const { kaiaKairos } = await import('@/lib/wagmiChains');
      const { createWeb3Modal } = await import('@web3modal/wagmi/react');

  const chains = [kaiaKairos] as const;

      // Use default connectors (wagmi v2.x auto-detects WalletConnect if projectId is set)
      const wagmiConfig = createConfig({
        chains,
        transports: {
          [kaiaKairos.id]: http(kaiaKairos.rpcUrls.default.http[0])
        },
        ssr: false
      });

      createWeb3Modal({
        wagmiConfig,
        projectId: WC_PROJECT_ID,
        enableAnalytics: false
      });

      // Simple helpers using Web3Modal’s open/close
      wagmiConnectRef.current = async () => {
        const modal = (window as any).web3modal;
        if (!modal) return null;
        const res = await modal.open(); // user picks wallet/provider
        // After connect, get address via wagmi (dynamic import)
        const { getAccount } = await import('wagmi/actions');
        const acc = getAccount(wagmiConfig);
        return acc?.address ?? null;
      };

      wagmiDisconnectRef.current = async () => {
        const { disconnect } = await import('wagmi/actions');
        await disconnect(wagmiConfig);
      };

      if (mounted) wagmiReadyRef.current = true;
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Restore address from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('moreearn.lastAddress');
    if (saved) setAddress(saved);
  }, []);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);

      // If we are in LIFF and MiniDapp supports connect
      if (isInLiff) {
        const sdk = getMiniDapp();
        const res = await sdk.connectWallet();
        const addr = res?.address?.toLowerCase?.() || '';
        if (addr) {
          setAddress(addr);
          localStorage.setItem('moreearn.lastAddress', addr);
          return;
        }
      }

      // Fallback to Web3Modal on web
      if (wagmiReadyRef.current && wagmiConnectRef.current) {
        const addr = await wagmiConnectRef.current();
        if (addr) {
          const low = addr.toLowerCase();
          setAddress(low);
          localStorage.setItem('moreearn.lastAddress', low);
        }
        return;
      }

      alert('Wallet connect not ready. Check NEXT_PUBLIC_WC_PROJECT_ID and rebuild.');
    } finally {
      setIsConnecting(false);
    }
  }, [isInLiff]);

  const disconnect = useCallback(async () => {
    try {
      if (wagmiReadyRef.current && wagmiDisconnectRef.current) {
        await wagmiDisconnectRef.current();
      }
    } finally {
      setAddress(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('moreearn.lastAddress');
      }
    }
  }, []);

  const ctx = useMemo<Ctx>(() => ({
    address,
    chainId,
    isConnecting,
    connect,
    disconnect,
    isInLiff
  }), [address, chainId, isConnecting, connect, disconnect, isInLiff]);

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
