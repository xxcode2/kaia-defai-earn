'use client';

import { useEffect, useState } from "react";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import { useDappPortal } from "@/components/DappPortalProvider";
import { useAccount } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';

export const dynamic = 'force-dynamic';

export default function LiffTestPage() {
  const { address } = useDappPortal();
  const { isConnected } = useAccount();
  const [ready, setReady] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setReady(true);
    setIsClient(true);
  }, []);

  const modal = isClient ? useWeb3Modal() : null;

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">LIFF Test</h1>

      {/* Tombol connect langsung */}
      <button
        onClick={() => modal?.open()}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Connect
      </button>

      {/* Wallet connect/disconnect */}
      <ConnectWalletButton />

      {/* Status info */}
      <div className="text-sm text-gray-600 space-y-1">
        <div>Status: {ready ? "✅ Client Ready" : "⏳ Loading…"}</div>
        <div>Connected: {isConnected ? "✅ Yes" : "❌ No"}</div>
        <div>Address: {address ?? "—"}</div>
      </div>
    </main>
  );
}