'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  PropsWithChildren
} from 'react';

import {
  WagmiConfig,
  createConfig,
  http,
  useAccount,
  useDisconnect
} from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { kaiaTestnet } from 'wagmi/chains';

import { createWeb3Modal, useWeb3Modal } from '@web3modal/wagmi/react';

// ============ Context types ============
type Ctx = {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isInLiff: boolean;
};

const DappPortalContext = createContext<Ctx | null>(null);

export function useDappPortal(): Ctx {
  const ctx = useContext(DappPortalContext);
  if (!ctx) throw new Error('useDappPortal must be used within <DappPortalProvider>');
  return ctx;
}

// ============ Helpers ============
const PROJECT_ID = (process.env.NEXT_PUBLIC_PROJECT_ID || '').trim();
const RPC_URL = (process.env.NEXT_PUBLIC_RPC || 'https://public-en-kairos.node.kaia.io').trim();
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1001);

// Wagmi config (WalletConnect + Injected)
const wagmiConfig = createConfig({
  chains: [kaiaTestnet],
  transports: {
    [kaiaTestnet.id]: http(RPC_URL)
  },
  connectors: [
    injected(),
    walletConnect({
      projectId: PROJECT_ID,
      showQrModal: false, // kita pakai modal dari web3modal
      relayUrl: 'wss://relay.walletconnect.com'
    })
  ]
});

// Init Web3Modal sekali di client
function useInitW3M() {
  React.useEffect(() => {
    if (!PROJECT_ID) {
      // Fail fast biar developer tahu kenapa modal gak muncul
      console.error('Missing NEXT_PUBLIC_PROJECT_ID for WalletConnect/Reown');
      return;
    }
    createWeb3Modal({
      wagmiConfig,
      projectId: PROJECT_ID,
      themeMode: 'dark',
      themeVariables: {
        '--w3m-accent-color': '#16a34a',
        '--w3m-background-color': '#0B0F13'
      }
    });
  }, []);
}

// Simple LIFF detector (cukup)
function useIsLiff(): boolean {
  const [isLiff, setIsLiff] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsLiff(window.location.host.includes('liff.line.me'));
  }, []);
  return isLiff;
}

// Inner provider yang memakai hooks wagmi + web3modal
function Inner({ children }: PropsWithChildren) {
  useInitW3M();
  const isInLiff = useIsLiff();

  const { address, chain, isConnecting, status } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { open } = useWeb3Modal();

  const connect = React.useCallback(async () => {
    // Tampilkan modal wallet (Bitget akan muncul jika domain Reown sudah diverifikasi)
    await open();
  }, [open]);

  const disconnect = React.useCallback(async () => {
    try {
      await wagmiDisconnect();
      // bersihkan state wagmi kalau masih tersisa
      localStorage.removeItem('wagmi.store');
    } catch {}
  }, [wagmiDisconnect]);

  const value = useMemo<Ctx>(
    () => ({
      address: address ?? null,
      chainId: chain?.id ?? CHAIN_ID ?? null,
      isConnecting: isConnecting || status === 'connecting',
      connect,
      disconnect,
      isInLiff
    }),
    [address, chain?.id, isConnecting, status, connect, disconnect, isInLiff]
  );

  return (
    <DappPortalContext.Provider value={value}>
      {children}
    </DappPortalContext.Provider>
  );
}

// Export utama: membungkus Wagmi + Context di atasnya
export default function DappPortalProvider({ children }: PropsWithChildren) {
  if (!PROJECT_ID) {
    // Jangan crash UI production, tapi log keras untuk dev
    console.warn('⚠️ NEXT_PUBLIC_PROJECT_ID tidak terpasang — WalletConnect tidak akan berfungsi');
  }

  return (
    <WagmiConfig config={wagmiConfig}>
      <Inner>{children}</Inner>
    </WagmiConfig>
  );
}
