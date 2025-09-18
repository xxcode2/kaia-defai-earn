'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { isLiffEnv } from '@/lib/env';

type HybridWalletCtx = {
  address?: string;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTx: (to: string, amount: string) => Promise<any>;
  provider?: any; // LIFF provider saat in-app
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

  // Browser (wagmi/web3modal)
  const { address: wagmiAddr, isConnected: wagmiConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { open } = useWeb3Modal();

  useEffect(() => {
    setIsLiff(isLiffEnv());
  }, []);

  useEffect(() => {
    if (!isLiff) return;
    (async () => {
      // load Kaia Mini Dapp SDK hanya di LIFF
      const [{ default: DappPortalSDK }, { Web3Provider }] = await Promise.all([
        import('@linenext/dapp-portal-sdk'),
        import('@kaiachain/ethers-ext'),
      ]);
      const sdk = await DappPortalSDK.init({
        clientId: process.env.NEXT_PUBLIC_MINIDAPP_CLIENT_ID!,
        chainId: process.env.NEXT_PUBLIC_CHAIN_ID || '1001',
      });
      const p = new Web3Provider(sdk.getWalletProvider());
      setProvider(p);
      const acc = await p.send('kaia_requestAccounts', []);
      setAddress(acc?.[0]);
    })();
  }, [isLiff]);

  // LIFF context
  const liffCtx: HybridWalletCtx = {
    address,
    isConnected: !!address,
    provider,
    connect: async () => {
      const acc = await provider.send('kaia_requestAccounts', []);
      setAddress(acc?.[0]);
    },
    disconnect: async () => {
      setAddress(undefined);
    },
    signTx: async (to: string, amount: string) => {
      if (!provider || !address) return null;
      const { TxType, parseKaia } = await import('@kaiachain/js-ext-core');
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

  // Browser context (wagmi)
  const browserCtx: HybridWalletCtx = {
    address: wagmiAddr,
    isConnected: wagmiConnected,
    provider: null,
    connect: async () => { await open(); },
    disconnect: async () => { await wagmiDisconnect(); },
    signTx: async () => null, // implement nanti pakai signer kalau perlu
  };

  return (
    <HybridWalletContext.Provider value={isLiff ? liffCtx : browserCtx}>
      {children}
    </HybridWalletContext.Provider>
  );
}

export function useHybridWallet() {
  return useContext(HybridWalletContext);
}
