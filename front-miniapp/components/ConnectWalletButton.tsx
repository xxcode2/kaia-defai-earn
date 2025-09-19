// components/ConnectWalletButton.tsx
'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount } from 'wagmi';

function isInLiff() {
  if (typeof window === 'undefined') return false;
  const liff = (window as any).liff;
  return !!(liff && typeof liff.isInClient === 'function'
    ? liff.isInClient()
    : window.location.host.includes('liff.line.me'));
}

export default function ConnectWalletButton() {
  const { address } = useAccount();
  const { open: w3mOpen } = useWeb3Modal();
  const [liffEnv, setLiffEnv] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    setLiffEnv(isInLiff());
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      if (liffEnv && (window as any).DAPP_PORTAL_SDK) {
        const sdk = (window as any).DAPP_PORTAL_SDK;
        const provider = sdk.getWalletProvider();
        const accs = await provider.request({ method: 'eth_requestAccounts' });
        console.log('connected via MiniDapp', accs);
        return;
      }

      if (liffEnv && !(window as any).DAPP_PORTAL_SDK) {
        const url = window.location.href.includes('?')
          ? `${window.location.href}&from=liff`
          : `${window.location.href}?from=liff`;
        const liff = (window as any).liff;
        if (liff?.openWindow) {
          await liff.openWindow({ url, external: true });
        } else {
          window.open(url, '_blank');
        }
        return;
      }

      if ((window as any).__W3M_OPEN__) {
        await (window as any).__W3M_OPEN__();
      } else if (w3mOpen) {
        await w3mOpen();
      } else {
        alert('Wallet modal not ready.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert('Connect failed: ' + msg);
    } finally {
      setConnecting(false);
    }
  }, [liffEnv, w3mOpen]);

  if (address) {
    return (
      <button className="px-3 py-2 rounded-xl text-sm bg-slate-900 text-white hover:bg-slate-800">
        Connected ({address.slice(0, 6)}…{address.slice(-4)})
      </button>
    );
  }

  if (liffEnv && !(window as any).DAPP_PORTAL_SDK) {
    return (
      <div className="flex gap-2">
        <button onClick={connect} className="px-3 py-2 rounded-xl text-sm bg-emerald-600 text-white">
          Buka di Browser
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
            alert('Link disalin. Buka di Safari/Chrome lalu Connect.');
          }}
          className="px-3 py-2 rounded-xl text-sm border"
        >
          Salin Link
        </button>
      </div>
    );
  }

  return (
    <button onClick={connect} className="px-3 py-2 rounded-xl text-sm bg-emerald-600 text-white" disabled={connecting}>
      {connecting ? 'Connecting…' : 'Connect'}
    </button>
  );
}
