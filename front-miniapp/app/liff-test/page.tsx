'use client';

import { useEffect, useState } from "react";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import { useDappPortal } from "@/components/DappPortalProvider";
import { useAccount } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';

export default function LiffTestPage() {
  const { address } = useDappPortal();
  const { isConnected } = useAccount();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">LIFF Test</h1>

 return (
    <main className="p-4 space-y-4">
      <button onClick={() => open()}>Connect</button>
      <div>Connected: {isConnected ? 'yes' : 'no'}</div>
      <div>Address: {address ?? '—'}</div>
    </main>
  );

      {/* Wallet connect/disconnect */}
      <ConnectWalletButton />

      {/* Status info */}
      <div className="text-sm text-gray-600 space-y-1">
        <div>Status: {ready ? "✅ Client Ready" : "⏳ Loading…"}</div>
        <div>Address: {address ?? "—"}</div>
      </div>
    </main>
  );
}
