"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initMini, getMiniDapp, isLiff, ensureWalletConnected } from "@/lib/miniDapp";

type Ctx = {
  address: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

const DappPortalCtx = createContext<Ctx | null>(null);

export function DappPortalProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Init MiniDapp shim/SDK sekali
  useEffect(() => {
    initMini().catch(() => {});
  }, []);

  const connect = useMemo(
    () => async () => {
      if (isConnecting) return;
      setIsConnecting(true);
      try {
        if (isLiff()) {
          // LIFF / Mini Dapp route
          const addr = await ensureWalletConnected();
          if (!addr) throw new Error("Failed to connect wallet");
          setAddress(addr);
        } else {
          // Web fallback → Metamask/Kaia wallet
          const eth = (globalThis as any).ethereum;
          if (!eth) throw new Error("No wallet provider found. Install Metamask/Kaia Wallet.");
          const accts: string[] = await eth.request({ method: "eth_requestAccounts" });
          if (!accts?.length) throw new Error("No account selected");
          setAddress(accts[0]);
        }
      } finally {
        setIsConnecting(false);
      }
    },
    [isConnecting]
  );

  const disconnect = useMemo(
    () => async () => {
      try {
        if (isLiff()) {
          const sdk = getMiniDapp();
          await sdk.disconnectWallet?.();
        }
      } finally {
        setAddress(null);
      }
    },
    []
  );

  const value: Ctx = { address, isConnecting, connect, disconnect };
  return <DappPortalCtx.Provider value={value}>{children}</DappPortalCtx.Provider>;
}

export function useDappPortal(): Ctx {
  const ctx = useContext(DappPortalCtx);
  if (!ctx) throw new Error("useDappPortal must be used within <DappPortalProvider>");
  return ctx;
}
