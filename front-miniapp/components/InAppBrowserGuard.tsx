// components/InAppBrowserGuard.tsx
'use client';

import { useEffect, useState } from 'react';

function isInApp() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /(Line|FBAN|FBAV|Instagram|Twitter|TikTok)/i.test(ua);
}

export default function InAppBrowserGuard() {
  const [show, setShow] = useState(false);

  useEffect(() => { setShow(isInApp()); }, []);

  if (!show) return null;

  return (
    <div className="mb-4 rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
      <b>Tips:</b> Kamu sedang membuka dApp di aplikasi (in-app browser).
      Untuk koneksi wallet, gunakan <b>WalletConnect</b> ke aplikasi wallet (MetaMask/Trust/OKX).
      Kalau kesulitan, buka dApp ini di browser biasa atau MetaMask browser.
    </div>
  );
}
