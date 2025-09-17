'use client';

import { useEffect, useState } from "react";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import { useDappPortal } from "@/components/DappPortalProvider";

// ✅ pastikan ini number atau false, jangan object
export const revalidate = 0;

export default function LiffTestPage() {
  const { address } = useDappPortal();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">LIFF Test</h1>

      {/* Tombol connect/disconnect wallet */}
      <ConnectWalletButton />

      {/* Status info */}
      <div className="text-sm text-gray-600 space-y-1">
        <div>Status: {ready ? "✅ Client Ready" : "⏳ Loading…"}</div>
        <div>Address: {address ?? "—"}</div>
      </div>
    </main>
  );
}
