'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type LiffCtx = {
  ready: boolean;
  profile?: { userId?: string; displayName?: string };
};

const LiffContext = createContext<LiffCtx>({ ready: false });

declare global {
  interface Window {
    liff?: any;
  }
}

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<LiffCtx['profile']>();

  useEffect(() => {
    const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;
    if (typeof window === 'undefined' || !LIFF_ID) {
      setReady(true); // jalan terus walau tanpa LIFF
      return;
    }

    (async () => {
      try {
        // Jika paket '@line/liff' tidak terpasang, ini tetap aman (optional).
        if (!window.liff) {
          // @ts-ignore
          const mod = await import(/* webpackIgnore: true */ '@line/liff').catch(() => null);
          if (mod?.default && !window.liff) window.liff = mod.default;
        }

        if (!window.liff) {
          setReady(true);
          return;
        }

        await window.liff.init({ liffId: LIFF_ID });
        if (!window.liff.isLoggedIn()) {
          // Tidak auto-login: biarkan developer kelola sendiri.
        } else {
          const p = await window.liff.getProfile();
          setProfile({ userId: p?.userId, displayName: p?.displayName });
        }
      } catch {
        // Abaikan error LIFF agar app tetap render
      } finally {
        setReady(true);
      }
    })();
  }, []);

  return <LiffContext.Provider value={{ ready, profile }}>{children}</LiffContext.Provider>;
}

export function useLiff() {
  return useContext(LiffContext);
}
