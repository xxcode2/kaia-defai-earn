'use client';

import ConnectWalletButton from '@/components/ConnectWalletButton';
import { useDappPortal } from '@/components/DappPortalProvider';
import { useEffect, useState } from 'react';

export default function LiffTestPage() {
  // Ambil hanya address (chainId belum ada di context)
  const { address } = useDappPortal();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">LIFF Test</h1>
      <ConnectWalletButton />

      <div className="text-sm text-gray-600">
        <div>Status: {ready ? 'Client Ready' : 'Loading…'}</div>
        <div>Address: {address ?? '—'}</div>
        {/* Chain ID di-comment dulu karena belum ada di provider */}
        {/* <div>Chain ID: {chainId ?? '—'}</div> */}
      </div>
    </main>
  );
}
