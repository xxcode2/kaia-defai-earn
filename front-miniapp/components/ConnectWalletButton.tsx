'use client';

import { useCallback } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';

function inLineWebView() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes(' line/') || ua.includes(' line ');
}

// coba buka eksternal via LIFF kalau ada
async function openExternalCurrentUrl() {
  try {
    const liff = (await import('@line/liff')).default;
    if (typeof liff?.openWindow === 'function') {
      liff.openWindow({ url: window.location.href, external: true });
      return;
    }
  } catch {}
  alert('Buka halaman ini di Chrome/Safari agar WalletConnect bisa jalan.');
}

export default function ConnectWalletButton() {
  const { address, isConnecting, isConnected } = useAccount();
  const { disconnect } = useDisconnect();     // <-- perbaikan di sini
  const { open } = useWeb3Modal();

  const onConnect = useCallback(async () => {
    if (inLineWebView()) {
      const ok = confirm(
        'WalletConnect mungkin diblok oleh WebView LINE.\n' +
          'Buka di browser eksternal (Chrome/Safari) agar bisa connect?'
      );
      if (ok) await openExternalCurrentUrl();
      return;
    }
    await open({ view: 'Connect' });
  }, [open]);

  const onDisconnect = useCallback(async () => {
    await disconnect();
  }, [disconnect]);

  if (isConnected) {
    const short = `${address?.slice(0, 6)}…${address?.slice(-4)}`;
    return (
      <button
        onClick={onDisconnect}
        className="px-3 py-2 rounded-xl text-sm bg-slate-900 text-white hover:bg-slate-800"
      >
        {short} · Disconnect
      </button>
    );
  }

  return (
    <button
      disabled={isConnecting}
      onClick={onConnect}
      className="px-3 py-2 rounded-xl text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
    >
      {isConnecting ? 'Connecting…' : 'Connect'}
    </button>
  );
}
