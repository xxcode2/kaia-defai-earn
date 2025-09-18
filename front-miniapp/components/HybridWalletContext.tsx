'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { isLiffEnv } from '@/lib/env';
import DappPortalSDK from '@linenext/dapp-portal-sdk';
import { Web3Provider } from '@kaiachain/ethers-ext';
import { TxType, parseKaia } from '@kaiachain/js-ext-core';
import { useAccount, useDisconnect, useWeb3Modal } from 'wagmi';

type HybridWalletCtx = {
  address?: string;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTx: (to: string, amount: string) => Promise<any>;
  provider?: any;
};

const HybridWalletContext = createContext<HybridWalletCtx>({
  address: undefined,
  isConnected: false,
  connect: async () => {},
  disconnect: async () => {},
  signTx: async () => ({}),
  provider: undefined,
});

export function HybridWalletProvider({ children }: { children: ReactNode }) {
  const [isLiff, setIsLiff] = useState(false);
  const [provider, setProvider] = useState<any>(null);
  const [address, setAddress] = useState<string>();

  // ---- Browser (wagmi/web3modal) ----
  const { address: wagmiAddr, isConnected: wagmiConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { open } = useWeb3Modal();

  useEffect(() => {
    setIsLiff(isLiffEnv());
  }, []);

  useEffect(() => {
    if (isLiff) {
      (async () => {
        const sdk = await DappPortalSDK.init({
          clientId: process.env.NEXT_PUBLIC_MINIDAPP_CLIENT_ID!,
          chainId: process.env.NEXT_PUBLIC_CHAIN_ID || '1001',
        });
        const p = new Web3Provider(sdk.getWalletProvider());
        setProvider(p);
        const accounts = await p.send('kaia_requestAccounts', []);
        setAddress(accounts[0]);
      })();
    }
  }, [isLiff]);

  // --------- LIFF (Mini Dapp) mode ---------
  const liffCtx: HybridWalletCtx = {
    address,
    isConnected: !!address,
    provider,
    connect: async () => {
      const acc = await provider.send('kaia_requestAccounts', []);
      setAddress(acc[0]);
    },
    disconnect: async () => {
      setAddress(undefined);
    },
    signTx: async (to: string, amount: string) => {
      if (!provider || !address) return null;
      const tx = {
        typeInt: TxType.FeeDelegatedValueTransfer,
        from: address,
        to,
        value: parseKaia(amount).toHexString(),
        feePayer: process.env.NEXT_PUBLIC_FEEPAYER || address,
      };
      return await provider.send('kaia_signTransaction', [tx]);
    },
  };

  // --------- Browser (Web3Modal/wagmi) mode ---------
  const browserCtx: HybridWalletCtx = {
    address: wagmiAddr,
    isConnected: wagmiConnected,
    provider: null,
    connect: async () => {
      await open(); // buka Web3Modal
    },
    disconnect: async () => {
      await wagmiDisconnect();
    },
    signTx: async (_to: string, _amount: string) => {
      // Untuk browser pakai ethers/wagmi signer biasanya
      // Dummy: return null
      return null;
    },
  };

  const ctx = isLiff ? liffCtx : browserCtx;

  return <HybridWalletContext.Provider value={ctx}>{children}</HybridWalletContext.Provider>;
}

export function useHybridWallet() {
  return useContext(HybridWalletContext);
}
