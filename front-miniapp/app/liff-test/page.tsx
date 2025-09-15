"use client";

import ConnectWalletButton from "@/components/ConnectWalletButton";
import { useLiffCtx } from "@/components/LiffProvider";
import { useDappCtx } from "@/components/DappPortalProvider";
import { useState } from "react";

export default function Page() {
  const { ready, profile } = useLiffCtx();
  const { supported, sdk } = useDappCtx();
  const [address, setAddress] = useState<string>("");

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">LIFF + DappPortal Test</h1>

      <div className="text-sm">
        <div>LIFF ready: <b>{ready ? "yes" : "no"}</b></div>
        <div>LINE user: <b>{profile?.displayName || "—"}</b></div>
      </div>

      <div className="text-sm">
        <div>DappPortal SDK: <b>{sdk ? "loaded" : "not loaded"}</b></div>
        <div>Browser supported: <b>{
          supported === null ? "unknown" : supported ? "yes" : "no"
        }</b></div>
      </div>

      <ConnectWalletButton onConnected={setAddress} />

      <div className="text-sm">
        Address: <b>{address || "—"}</b>
      </div>
    </div>
  );
}
