// components/ConnectWalletButton.tsx
'use client';

import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount, useDisconnect } from 'wagmi';

function shortAddr(addr?: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ConnectWalletButton() {
  const { address, isConnecting } = useAccount();
  const { open } = useWeb3Modal();
  const { disconnect } = useDisconnect();

  if (!address) {
    return (
      <button
        onClick={() => open()}
        disabled={isConnecting}
        className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-50"
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
