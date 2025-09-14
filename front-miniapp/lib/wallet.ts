// lib/wallet.ts
"use client";

import { useEffect, useState } from "react";

type EthereumProvider = {
  request: (args: { method: string; params?: any[] | object }) => Promise<any>;
  on?: (event: string, cb: (...a: any[]) => void) => void;
  removeListener?: (event: string, cb: (...a: any[]) => void) => void;
} | undefined;

function getEth(): EthereumProvider {
  if (typeof window === "undefined") return undefined;
  return (window as any).ethereum;
}

export function useAddress(): string {
  const [addr, setAddr] = useState<string>("");

  useEffect(() => {
    const eth = getEth();
    if (!eth) return;

    // initial fetch
    eth
      .request({ method: "eth_accounts" })
      .then((accs: string[]) => setAddr(accs?.[0] ?? ""))
      .catch(() => {});

    // listen to changes
    const onAccountsChanged = (accs: string[]) => setAddr(accs?.[0] ?? "");
    eth.on?.("accountsChanged", onAccountsChanged);

    return () => eth.removeListener?.("accountsChanged", onAccountsChanged);
  }, []);

  return addr;
}

export async function disconnectWallet() {
  const eth = getEth();
  try {
    await eth?.request?.({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch {
    // sebagian wallet tidak support; cukup silent
  }
}
