// lib/wallet.ts
"use client";

import { useEffect, useState } from "react";
import { init } from "@reown/mini-dapp-sdk";

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID!;

init({
  projectId,
  metadata: {
    name: "MORE Earn",
    description: "USDT Yield Vault on Kaia",
    url: "https://more-earn.vercel.app",
    icons: ["https://more-earn.vercel.app/brand/more.png"],
  },
});


type EthereumProvider = {
  request: (args: { method: string; params?: any[] | object }) => Promise<any>;
  on?: (event: string, cb: (...a: any[]) => void) => void;
  removeListener?: (event: string, cb: (...a: any[]) => void) => void;
} | undefined;

function getEth(): EthereumProvider {
  if (typeof window === "undefined") return undefined;
  return (window as any).ethereum;
}

/**
 * Hook untuk mendapatkan address saat ini.
 * Tidak auto-connect, hanya baca jika wallet sudah connect sebelumnya.
 */
export function useAddress(): string {
  const [addr, setAddr] = useState<string>("");

  useEffect(() => {
    const eth = getEth();
    if (!eth) return;

    // cek apakah sudah pernah connect (eth_accounts, bukan eth_requestAccounts)
    eth
      .request({ method: "eth_accounts" })
      .then((accs: string[]) => setAddr(accs?.[0] ?? ""))
      .catch(() => {});

    // listen perubahan akun
    const onAccountsChanged = (accs: string[]) => setAddr(accs?.[0] ?? "");
    eth.on?.("accountsChanged", onAccountsChanged);

    return () => eth.removeListener?.("accountsChanged", onAccountsChanged);
  }, []);

  return addr;
}

/**
 * Fungsi untuk explicit connect — dipanggil manual dari tombol.
 */
export async function connectWallet(): Promise<string | null> {
  try {
    const eth = getEth();
    if (!eth) throw new Error("Ethereum provider not found");
    const accs: string[] = await eth.request({ method: "eth_requestAccounts" });
    return accs?.[0] ?? null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

/**
 * Fungsi untuk disconnect (revoke permissions).
 * Tidak semua wallet support, jadi dibuat silent kalau gagal.
 */
export async function disconnectWallet() {
  const eth = getEth();
  try {
    await eth?.request?.({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch {
    // sebagian wallet tidak support
  }
}
