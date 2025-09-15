"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getLiff } from "@/lib/liffClient";

type LiffContextType = {
  ready: boolean;
  profile: { userId?: string; displayName?: string } | null;
};

const LiffCtx = createContext<LiffContextType>({ ready: false, profile: null });

export function useLiffCtx() {
  return useContext(LiffCtx);
}

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<LiffContextType["profile"]>(null);

  useEffect(() => {
    (async () => {
      const liff = await getLiff();
      if (!liff) {
        setReady(false);
        return;
      }
      try {
        // LIFF ready
        if (!liff.isLoggedIn()) {
          // opsional: jangan auto-login; serahkan ke UX kamu
          // liff.login();
        }
        if (liff.isLoggedIn()) {
          const p = await liff.getProfile();
          setProfile({ userId: p.userId, displayName: p.displayName });
        }
        setReady(true);
      } catch (e) {
        console.warn("LIFF profile failed:", e);
        setReady(true);
      }
    })();
  }, []);

  return (
    <LiffCtx.Provider value={{ ready, profile }}>{children}</LiffCtx.Provider>
  );
}
