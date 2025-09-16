// components/DappPortalProvider.tsx
'use client';
import React, { createContext, useContext, useMemo, useState } from 'react';
import EthereumProvider from '@walletconnect/ethereum-provider';
import { ethers } from 'ethers';

type Ctx = {
  address?: string;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

const DappPortalCtx = createContext<Ctx>({
  isConnecting: false,
  connect: async () => {},
  disconnect: async () => {},
});

export function useDappPortal() {
  return useContext(DappPortalCtx);
}

export function DappPortalProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string>();
  const [isConnecting, setIsConnecting] = useState(false);
  const [wc, setWc] = useState<any>(null); // EthereumProvider WC v2
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1001);
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_HTTP!;
  const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID!;

  async function connect() {
    try {
      setIsConnecting(true);

      // 1) Coba injected provider dahulu (kalau buka dari wallet in-app browser)
      const injected = (globalThis as any).ethereum;
      if (injected && injected.request) {
        const provider = new ethers.BrowserProvider(injected);
        const accs = await injected.request({ method: 'eth_requestAccounts' });
        setAddress(ethers.getAddress(accs[0]));
        return;
      }

      // 2) LIFF / tidak ada injected → pakai WalletConnect v2
      const wcProvider = await EthereumProvider.init({
        projectId,
        chains: [chainId],
        rpcMap: { [chainId]: rpcUrl },
        showQrModal: true,      // modal QR + deep-link ke Bitget/Kaikas
        optionalMethods: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData'],
        metadata: {
          name: process.env.NEXT_PUBLIC_APP_NAME || 'MORE Earn',
          description: process.env.NEXT_PUBLIC_APP_DESC || 'Kaia Mini Dapp',
          url: process.env.NEXT_PUBLIC_APP_URL || 'https://more-earn.vercel.app',
          icons: ['https://more-earn.vercel.app/brand/more1.png'],
        },
      });

      // Buka modal & deep-link (di LIFF user akan diarahkan ke app wallet)
      await wcProvider.connect();
      setWc(wcProvider);

      const provider = new ethers.BrowserProvider(wcProvider as any);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setAddress(ethers.getAddress(addr));

      // Optional: simpan di window supaya bagian lain app bisa pakai
      (globalThis as any).ethereum = wcProvider;
    } finally {
      setIsConnecting(false);
    }
  }

  async function disconnect() {
    try {
      if (wc?.disconnect) await wc.disconnect();
    } catch {}
    setWc(null);
    setAddress(undefined);
  }

  const value = useMemo(
    () => ({ address, isConnecting, connect, disconnect }),
    [address, isConnecting]
  );

  return <DappPortalCtx.Provider value={value}>{children}</DappPortalCtx.Provider>;
}
