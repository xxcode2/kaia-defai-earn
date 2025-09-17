'use client';

export const dynamic = 'force-dynamic'; // paksa SSR, jangan di-export statis
export const revalidate = 0;            // atau: export const revalidate = false;

import { useEffect, useState } from 'react';
import { useDappPortal } from '@/components/DappPortalProvider';
import ConnectWalletButton from '@/components/ConnectWalletButton';

export default function LiffTestPage() {
  const { address } = useDappPortal();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  if (!ready) {
    return (
      <main className="p-4">
        <div className="text-sm text-slate-500">Loading…</div>
      </main>
    );
  }

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">LIFF Test</h1>
      <ConnectWalletButton />
      <div className="text-sm text-gray-600 space-y-1">
        <div>Status: Client Ready</div>
        <div>Address: {address ?? '—'}</div>
      </div>
    </main>
  );
}
