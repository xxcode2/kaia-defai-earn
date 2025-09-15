"use client";

import { useState } from "react";
import { useDappCtx } from "./DappPortalProvider";
import { BrowserProvider } from "ethers";

export default function ConnectWalletButton({
  onConnected,
  className,
}: {
  onConnected?: (address: string) => void;
  className?: string;
}) {
  const { sdk, supported } = useDappCtx();
  const [loading, setLoading] = useState(false);
  const [addr, setAddr] = useState<string>("");

  async function connect() {
    setLoading(true);
    try {
      let eip1193: any = null;

      // Prioritas 1: DappPortal SDK (jika tersedia)
      if (sdk?.getWalletProvider) {
        if (supported === false) {
          try {
            await sdk.showUnsupportedBrowserGuide();
          } catch {}
          setLoading(false);
          return;
        }
        eip1193 = sdk.getWalletProvider();
      }

      // Fallback: window.ethereum (mis. MetaMask) saat di web biasa
      if (!eip1193 && typeof window !== "undefined") {
        // @ts-ignore
        eip1193 = (window as any).ethereum || null;
      }

      if (!eip1193) {
        alert("No wallet provider found.");
        setLoading(false);
        return;
      }

      const provider = new BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      // Pastikan minta akun kalau belum
      if (eip1193.request) {
        await eip1193.request({ method: "eth_requestAccounts" });
      }
      const me = await signer.getAddress();
      setAddr(me);
      onConnected?.(me);
    } catch (e: any) {
      alert(e?.message || "Connect failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={connect}
      disabled={loading}
      className={className || "px-4 py-2 rounded-xl bg-emerald-600 text-white"}
    >
      {addr ? `Connected: ${addr.slice(0, 6)}…${addr.slice(-4)}` : loading ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
