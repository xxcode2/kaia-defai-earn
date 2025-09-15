"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLiffCtx } from "./LiffProvider";
import { getDappPortal } from "@/lib/dappPortal";

type DappCtxType = {
  sdk: any | null;
  supported: boolean | null;
};

const DappCtx = createContext<DappCtxType>({ sdk: null, supported: null });

export function useDappCtx() {
  return useContext(DappCtx);
}

export function DappPortalProvider({ children }: { children: React.ReactNode }) {
  const { ready: liffReady } = useLiffCtx();
  const [sdk, setSdk] = useState<any | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    if (!liffReady) return;
    (async () => {
      const s = await getDappPortal();
      if (!s) {
        // tidak ada clientId → biarkan null, app tetap jalan
        setSdk(null);
        setSupported(null);
        return;
      }
      try {
        const ok =
          typeof s.isSupportedBrowser === "function" ? s.isSupportedBrowser() : true;
        setSupported(ok);
        setSdk(s);
      } catch {
        setSupported(null);
        setSdk(s);
      }
    })();
  }, [liffReady]);

  const value = useMemo(() => ({ sdk, supported }), [sdk, supported]);

  return <DappCtx.Provider value={value}>{children}</DappCtx.Provider>;
}
