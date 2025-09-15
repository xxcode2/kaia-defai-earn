'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';

type DappContextValue = {
  address?: string;
  chainId?: number;
  provider?: ethers.BrowserProvider;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

const DappPortalContext = createContext<DappContextValue | null>(null);

export function DappPortalProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string>();
  const [chainId, setChainId] = useState<number>();
  const [provider, setProvider] = useState<ethers.BrowserProvider>();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const eth = (window as any).ethereum;
    if (!eth) return;

    const prov = new ethers.BrowserProvider(eth);
    setProvider(prov);

    const onAccountsChanged = (accounts: string[]) => {
      setAddress(accounts?.length ? ethers.getAddress(accounts[0]) : undefined);
    };
    const onChainChanged = async () => {
      try {
        const net = await prov.getNetwork();
        setChainId(Number(net.chainId));
      } catch {}
    };

    eth.on?.('accountsChanged', onAccountsChanged);
    eth.on?.('chainChanged', onChainChanged);

    (async () => {
      try {
        const accounts: string[] = await eth.request?.({ method: 'eth_accounts' });
        if (accounts?.length) setAddress(ethers.getAddress(accounts[0]));
        const net = await prov.getNetwork();
        setChainId(Number(net.chainId));
      } catch {}
    })();

    return () => {
      eth.removeListener?.('accountsChanged', onAccountsChanged);
      eth.removeListener?.('chainChanged', onChainChanged);
    };
  }, []);

  const connect = async () => {
    if (!provider) throw new Error('Wallet provider tidak tersedia.');
    try {
      setIsConnecting(true);
      const eth = (window as any).ethereum;
      await eth.request({ method: 'eth_requestAccounts' });
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      const net = await provider.getNetwork();
      setAddress(ethers.getAddress(addr));
      setChainId(Number(net.chainId));
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    setAddress(undefined);
  };

  const value = useMemo(
    () => ({ address, chainId, provider, isConnecting, connect, disconnect }),
    [address, chainId, provider, isConnecting]
  );

  return <DappPortalContext.Provider value={value}>{children}</DappPortalContext.Provider>;
}

/** ✅ Named hook export */
export function useDappPortal() {
  const ctx = useContext(DappPortalContext);
  if (!ctx) throw new Error('useDappPortal harus dipakai di dalam <DappPortalProvider>.');
  return ctx;
}

/** ✅ Default export untuk provider (sesuai import di layout.tsx) */
export default DappPortalProvider;
