// components/ConnectWalletButton.tsx
"use client";

import { useEffect, useState } from "react";
import { useDappPortal } from "@/components/DappPortalProvider";

export default function ConnectWalletButton() {
  const { sdk } = useDappPortal();
  const [address, setAddress] = useState<string>("");

  useEffect(() => {
    // cek akun yang sudah terhubung (jika ada) untuk menampilkan state awal
    (async () => {
      try {
        const provider = sdk?.getWalletProvider?.();
        if (!provider) return;
        const accs: string[] = await provider.request({ method: "eth_accounts" });
        setAddress(accs?.[0] ?? "");
        provider.on?.("accountsChanged", (accs: string[]) => setAddress(accs?.[0] ?? ""));
      } catch {
        // silent
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdk]);

  async function onConnect() {
    try {
      const provider = sdk?.getWalletProvider?.();
      if (!provider) {
        alert("SDK belum siap. Pastikan DappPortalProvider terpasang & clientId terisi.");
        return;
      }
      const accs: string[] = await provider.request({ method: "eth_requestAccounts" });
      setAddress(accs?.[0] ?? "");
    } catch (e: any) {
      alert(e?.message || "Connect failed");
    }
  }

  async function onDisconnect() {
    try {
      const provider = sdk?.getWalletProvider?.();
      await provider?.request?.({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // beberapa wallet tidak support
    }
    setAddress("");
  }

  return address ? (
    <button
      onClick={onDisconnect}
      className="px-3 py-2 rounded-md bg-slate-900 text-white text-sm"
    >
      {address.slice(0, 6)}…{address.slice(-4)} · Disconnect
    </button>
  ) : (
    <button
      onClick={onConnect}
      className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm"
    >
      Connect Wallet
    </button>
  );
}
