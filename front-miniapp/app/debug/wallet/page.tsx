'use client';

import { useEffect, useState } from 'react';
import { useDappPortal } from '@/components/DappPortalProvider';

export default function WalletDebug() {
  const { address, isInLiff, connect, disconnect } = useDappPortal();
  const [hasMini, setHasMini] = useState<boolean|null>(null);
  const [hasMiniProvider, setHasMiniProvider] = useState<boolean|null>(null);

  useEffect(() => {
    const mini: any = (window as any).__MINIDAPP__;
    setHasMini(!!mini);
    setHasMiniProvider(!!mini?.getWalletProvider?.());
  }, []);

  return (
    <main className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">Wallet Debug</h1>
      <div>isInLiff: {String(isInLiff)}</div>
      <div>hasMini: {String(hasMini)}</div>
      <div>hasMiniProvider: {String(hasMiniProvider)}</div>
      <div>address: {address || '—'}</div>

      <div className="flex gap-2">
        <button className="px-3 py-2 bg-black text-white rounded" onClick={connect}>Connect</button>
        <button className="px-3 py-2 border rounded" onClick={disconnect}>Disconnect</button>
      </div>
    </main>
  );
}
