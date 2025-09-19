// front-miniapp/components/ConnectWalletButton.tsx
'use client';

import React, { useCallback, useState } from 'react';
import { isLiffEnv, isLikelyBlockedWebview } from '@/lib/env';

export default function ConnectWalletButton({ children }: { children?: React.ReactNode }) {
  const [loading, setLoading] = useState(false);

  const onConnect = useCallback(async () => {
    setLoading(true);
    try {
      // If MiniDapp provider attached to window.ethereum (LIFF path)
      // @ts-ignore
      const eth = (window as any).ethereum;
      if (eth && typeof eth.request === 'function') {
        try {
          await eth.request({ method: 'eth_requestAccounts' });
          // optionally trigger account detect event or reload
          const acc = await eth.request({ method: 'eth_accounts' });
          console.log('connected accounts', acc);
          // emit custom event for app to pick up
          window.dispatchEvent(new CustomEvent('wallet_connected', { detail: { accounts: acc } }));
          return;
        } catch (err: any) {
          console.warn('eth_requestAccounts failed', err);
          // continue to try other path
        }
      }

      // If web3modal opened helper exists (browser path)
      const open = (window as any).__W3M_OPEN__;
      if (typeof open === 'function') {
        await open({ view: 'Connect' });
        // web3modal will populate connectors; we give some time then dispatch event
        setTimeout(async () => {
          // try detect accounts with injected or wc
          try {
            const eth2 = (window as any).ethereum;
            if (eth2 && typeof eth2.request === 'function') {
              const accounts = await eth2.request({ method: 'eth_accounts' });
              window.dispatchEvent(new CustomEvent('wallet_connected', { detail: { accounts } }));
            }
          } catch {}
        }, 1000);
        return;
      }

      // Else: if in LIFF but no provider (MiniDapp not available) or webview blocks WC: open external browser
      if (isLiffEnv() || isLikelyBlockedWebview()) {
        // If LIFF SDK present, call liff.openWindow to open external
        // @ts-ignore
        const liff = (window as any).liff;
        const externalUrl = location.href;
        if (liff && typeof liff.openWindow === 'function') {
          try {
            liff.openWindow({ url: externalUrl, external: true });
            return;
          } catch (e) {
            // fallback:
            window.open(externalUrl, '_blank');
            return;
          }
        }
        // fallback to open new tab
        window.open(location.href, '_blank');
        return;
      }

      alert('No wallet connector found on this device. Install a wallet or ensure WalletConnect project id is configured.');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <button
      onClick={onConnect}
      className="px-3 py-2 rounded-xl text-sm bg-emerald-600 text-white hover:bg-emerald-700"
      aria-busy={loading}
    >
      {children ?? (loading ? 'Connecting…' : 'Connect')}
    </button>
  );
}
