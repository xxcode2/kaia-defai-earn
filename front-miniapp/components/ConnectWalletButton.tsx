'use client';

import { useDappPortal } from '@/components/DappPortalProvider';

function shortAddr(addr?: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ConnectWalletButton() {
  const { address, isConnecting, connect, disconnect } = useDappPortal();

  if (!address) {
    return (
      <button
        onClick={connect}
        disabled={isConnecting}
        className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50 transition"
      >
        {isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium px-3 py-1 rounded-lg bg-gray-100 border border-gray-200">
        {shortAddr(address)}
      </span>
      <button
        onClick={disconnect}
        className="px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 transition"
        title="Disconnect (clear session)"
      >
        Disconnect
      </button>
    </div>
  );
}
