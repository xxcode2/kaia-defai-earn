// components/ConnectWalletButton.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount } from 'wagmi';
import { getConnectors, connect, disconnect, switchChain } from 'wagmi/actions';
import { wagmiConfig } from '@/components/Web3ModalInit';

function isInLiff() {
  if (typeof window === 'undefined') return false;
  const liff = (window as any).liff;
  return !!(liff && typeof liff.isInClient === 'function'
    ? liff.isInClient()
    : window.location.host.includes('liff.line.me'));
}

export default function ConnectWalletButton() {
  const { address, isConnected } = useAccount();
  const { open } = useWeb3Modal();
  const [liffEnv, setLiffEnv] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLiffEnv(isInLiff());
  }, []);

  const short = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }, [address]);

  async function smartConnect() {
    setBusy(true);
    try {
      // 1) Kalau di LIFF tapi SDK MiniDapp tidak ada → buka eksternal browser
      if (liffEnv && !(window as any).DAPP_PORTAL_SDK) {
        const url = window.location.href.includes('?')
          ? `${window.location.href}&from=liff`
          : `${window.location.href}?from=liff`;
        const liff = (window as any).liff;
        if (liff?.openWindow) await liff.openWindow({ url, external: true });
        else window.open(url, '_blank');
        return;
      }

      // 2) Prioritaskan injected (OKX/Bitget/MetaMask in-app browser)
      const injected = getConnectors(wagmiConfig).find((c) => c.id === 'injected');
      if (injected) {
        const provider = await injected.getProvider?.();
        if (provider) {
          await connect(wagmiConfig, { connector: injected });
          // pastikan sudah Kairos (1001)
          await switchChain(wagmiConfig, { chainId: 1001 }).catch(() => {});
          return;
        }
      }

      // 3) Tidak ada injected → buka WalletConnect modal
      if ((window as any).__W3M_OPEN__) await (window as any).__W3M_OPEN__({ view: 'Connect' });
      else if (open) await open({ view: 'Connect' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert('Connect failed: ' + msg);
    } finally {
      setBusy(false);
    }
  }

  async function doDisconnect() {
    setBusy(true);
    try {
      await disconnect(wagmiConfig);
    } finally {
      setBusy(false);
    }
  }

  // UI khusus LIFF tanpa SDK — ajak buka di browser
  if (liffEnv && !(window as any).DAPP_PORTAL_SDK) {
    return (
      <div className="flex gap-2">
        <button
          onClick={smartConnect}
          className="px-3 py-2 rounded-xl text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          disabled={busy}
        >
          {busy ? 'Opening…' : 'Buka di Browser'}
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
            alert('Link disalin. Buka di Safari/Chrome lalu tekan Connect.');
          }}
          className="px-3 py-2 rounded-xl text-sm border"
        >
          Salin Link
        </button>
      </div>
    );
  }

  // Default
  if (isConnected && address) {
    return (
      <button
        onClick={doDisconnect}
        className="px-3 py-2 rounded-xl text-sm bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
        disabled={busy}
      >
        {busy ? 'Disconnecting…' : `Disconnect (${short})`}
      </button>
    );
  }

  return (
    <button
      onClick={smartConnect}
      className="px-3 py-2 rounded-xl text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
      disabled={busy}
    >
      {busy ? 'Connecting…' : 'Connect'}
    </button>
  );
}
