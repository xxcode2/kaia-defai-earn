// components/DappPortalProvider.tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initDappPortal, getDappPortal } from "@/lib/dappPortal";

type DappCtxType = {
  sdk: any | null;
};

const DappCtx = createContext<DappCtxType>({ sdk: null });

export function useDappPortal() {
  return useContext(DappCtx);
}

export default function DappPortalProvider({ children }: { children: React.ReactNode }) {
  const [sdk, setSdk] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await initDappPortal();
      if (!mounted) return;
      setSdk(getDappPortal());
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(() => ({ sdk }), [sdk]);

  return <DappCtx.Provider value={value}>{children}</DappCtx.Provider>;
}
