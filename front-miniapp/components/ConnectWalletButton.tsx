// components/ConnectWalletButton.tsx
'use client';

import { useAccount, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';

function shortAddr(addr?: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ConnectWalletButton() {
  const { address, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const [modalReady, setModalReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // flag di-set oleh Web3Root setelah createWeb3Modal
    setModalReady(Boolean((window as any).__W3M_INITIALIZED__));
  }, []);

  const openModal = () => {
    const open = (window as any).__W3M_OPEN__;
    if (typeof open === 'function') {
      open({ view: 'Connect' });
    } else {
      alert('Wallet modal belum siap. Muat ulang halaman & cek NEXT_PUBLIC_WC_PROJECT_ID.');
    }
  };

  if (!address) {
    return (
      <button
        onClick={openModal}
        disabled={isConnecting || !modalReady}
        className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-50"
        title={!modalReady ? 'Menginisialisasi wallet modal…' : ''}
      >
        {isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium px-3 py-1 rounded-lg bg-gray-100">
        {shortAddr(address)}
      </span>
      <button
        onClick={() => disconnect()}
        className="px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
        title="Disconnect (clear session)"
      >
        Disconnect
      </button>
    </div>
  );
}
