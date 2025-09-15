// app/liff-test/page.tsx
"use client";

import ConnectWalletButton from "@/components/ConnectWalletButton";
import { useDappPortal } from "@/components/DappPortalProvider";
import { useEffect, useState } from "react";

export default function LiffTestPage() {
  const { sdk } = useDappPortal();
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    if (!sdk) return;
    try {
      setSupported(!!sdk.isSupportedBrowser?.());
    } catch {
      setSupported(null);
    }
  }, [sdk]);

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">LIFF + Dapp Portal Test</h1>

      <div className="text-sm">
        SDK: {sdk ? "initialized" : "not ready"}
        {supported !== null && (
          <span className="ml-2">
            · Browser: {supported ? "supported" : "unsupported"}
          </span>
        )}
      </div>

      <ConnectWalletButton />

      <p className="text-xs text-gray-500">
        Wallet tidak akan auto-connect. Klik tombol di atas untuk connect.
      </p>
    </div>
  );
}
