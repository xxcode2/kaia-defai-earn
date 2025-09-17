// app/liff-test/page.tsx
'use client';

export const dynamic = 'force-dynamic'; // cegah SSG/prerender
export const revalidate = 0;

import { useEffect, useState } from 'react';
import { useDappPortal } from '@/components/DappPortalProvider';
import ConnectWalletButton from '@/components/ConnectWalletButton';

export default function LiffTestPage() {
  // aman dipakai karena halaman ini client component
  const { address /* , chainId (opsional) */ } = useDappPortal();
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
        {/* <div>Chain ID: {chainId ?? '—'}</div> */}
      </div>
    </main>
  );
}
