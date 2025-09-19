'use client';

import { useDappPortal } from '@/components/DappPortalProvider';
import { isInLiff, openExternalBrowser } from '@/lib/liffHelpers';

function shortAddr(addr?: string | null) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ConnectWalletButton() {
  const { address, isConnecting, connect, disconnect } = useDappPortal();
  const inLiff = isInLiff();

  if (!address) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={connect}
          disabled={isConnecting}
          className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-50"
        >
          {isConnecting ? 'Connecting…' : 'Connect Wallet'}
        </button>

        {inLiff && (
          <button
            onClick={() => openExternalBrowser()}
            className="px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
            title="Buka di browser eksternal (Chrome/Safari) bila WalletConnect tidak jalan di LIFF"
          >
            Open in browser
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium px-3 py-1 rounded-lg bg-gray-100">
        {shortAddr(address)}
      </span>
      <button
        onClick={disconnect}
        className="px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
        title="Disconnect (clear session)"
      >
        Disconnect
      </button>
    </div>
  );
}
