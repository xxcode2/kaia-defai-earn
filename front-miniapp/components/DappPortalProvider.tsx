// components/DappPortalProvider.tsx
'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  PropsWithChildren,
} from 'react';

import { initMini, getMiniDapp } from '@/lib/miniDapp';

type Ctx = {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  // Utility
  isInLiff: boolean;
};

const DappPortalContext = createContext<Ctx | null>(null);

function getEnvNumber(name: string, dflt: number | null = null): number | null {
  const raw = process.env[name as any];
  if (!raw) return dflt;
  const n = Number(raw);
  return Number.isFinite(n) ? n : dflt;
}

const LIFF_ID = (process.env.NEXT_PUBLIC_LIFF_ID || '').trim();
const DEFAULT_CHAIN_ID = getEnvNumber('NEXT_PUBLIC_CHAIN_ID', null);

export function DappPortalProvider({ children }: PropsWithChildren) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(DEFAULT_CHAIN_ID ?? null);
  const [isConnecting, setIsConnecting] = useState(false);

  const [isInLiff, setIsInLiff] = useState(false);
  const liffReadyRef = useRef(false);
  const miniReadyRef = useRef(false);

  // Detect LIFF environment and init LIFF (only inside LIFF)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (typeof window === 'undefined') return;

      // Heuristic: LIFF pages are served under liff.line.me
      const looksLikeLiff = window.location?.host?.includes('liff.line.me');
      if (!looksLikeLiff || !LIFF_ID) {
        setIsInLiff(false);
        return;
      }

      try {
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId: LIFF_ID });
        if (!cancelled) {
          setIsInLiff(true);
          liffReadyRef.current = true;

          // Optional: auto-login once (only if really not logged in)
          if (!liff.isLoggedIn()) {
            // Avoid infinite login loop: only call once
            liff.login();
          }
        }
      } catch (e) {
        // Keep going even if LIFF init fails; app still usable in web
        console.warn('LIFF init error:', e);
        if (!cancelled) setIsInLiff(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Init Mini Dapp SDK (shim or real when available)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await initMini(); // safe even if shim
        if (!cancelled) {
          miniReadyRef.current = true;
        }
      } catch (e) {
        console.warn('MiniDapp init error:', e);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Restore address from storage (optional persistence)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('moreearn.lastAddress');
    if (saved) setAddress(saved);
  }, []);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);

      // Ensure SDK ready
      if (!miniReadyRef.current) {
        await initMini();
        miniReadyRef.current = true;
      }
      const sdk = getMiniDapp();

      // Try connect via Mini Dapp (WalletConnect/Bitget via Reown once enabled)
      const res = await sdk.connectWallet();
      const addr = (res?.address || '').toLowerCase();

      if (!addr) {
        // If shim warns, user is likely on web non-LIFF; nothing else to do
        setIsConnecting(false);
        return;
      }

      setAddress(addr);
      // If SDK can return chain id later, set here; for now use env default
      if (DEFAULT_CHAIN_ID != null) setChainId(DEFAULT_CHAIN_ID);

      // Persist locally to restore on reload
      if (typeof window !== 'undefined') {
        localStorage.setItem('moreearn.lastAddress', addr);
      }
    } catch (e: any) {
      console.error('connect error:', e);
      alert(e?.message || 'Connect failed');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      // Clear local state
      setAddress(null);
      // Optional: if SDK provides a disconnect/kill session, call it too
      const sdk = getMiniDapp();
      await sdk.disconnectWallet?.();
    } catch {
      // ignore
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('moreearn.lastAddress');
      }
    }
  }, []);

  const value = useMemo<Ctx>(() => ({
    address,
    chainId,
    isConnecting,
    connect,
    disconnect,
    isInLiff,
  }), [address, chainId, isConnecting, connect, disconnect, isInLiff]);

  return (
    <DappPortalContext.Provider value={value}>
      {children}
    </DappPortalContext.Provider>
  );
}

export function useDappPortal(): Ctx {
  const ctx = useContext(DappPortalContext);
  if (!ctx) {
    throw new Error('useDappPortal must be used within <DappPortalProvider>');
  }
  return ctx;
}
