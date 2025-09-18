'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import ConnectWalletButton from '@/components/ConnectWalletButton';

export default function LiffTestClient() {
  const { isConnected, address } = useAccount();
  const [ready] = useState(true);

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">LIFF Test</h1>

      <ConnectWalletButton />

      <div className="text-sm text-gray-600 space-y-1">
        <div>Status: {ready ? '✅ Client Ready' : '⏳ Loading…'}</div>
        <div>Connected: {isConnected ? '✅ Yes' : '❌ No'}</div>
        <div>Address: {address ?? '—'}</div>
      </div>
    </main>
  );
}
