// components/InAppWebviewGuard.tsx
'use client';

import { isInAppWebView, isLiffEnv } from '@/lib/env';
import { openExternalBrowser } from './OpenExternal';
import { useMemo } from 'react';

export default function InAppWebviewGuard({ children }: { children: React.ReactNode }) {
  const inApp = useMemo(() => isInAppWebView(), []);
  const inLiff = useMemo(() => isLiffEnv(), []);

  // Jika kamu BELUM punya clientId Mini Dapp (Dapp Portal),
  // maka LIFF juga harus diarahkan keluar ke browser eksternal.
  const mustBlock = inApp; // true untuk semua in-app (termasuk LIFF sementara ini)

  if (!mustBlock) return <>{children}</>;

  const goExternal = () => {
    // arahkan ke URL yang sama tapi di browser eksternal
    openExternalBrowser(window.location.href);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="max-w-sm w-full space-y-4 text-center">
        <h1 className="text-lg font-semibold">Buka di Browser Eksternal</h1>
        <p className="text-sm text-slate-600">
          Untuk menghubungkan wallet, silakan buka halaman ini di Chrome (Android) atau Safari (iOS).
          Beberapa aplikasi (termasuk LINE/LIFF) membatasi koneksi WalletConnect di webview internal.
        </p>
        <button
          onClick={goExternal}
          className="mt-2 w-full px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Buka di Browser
        </button>
        <p className="text-xs text-slate-500">
          Setelah terbuka di browser, tekan tombol <b>Connect</b> lalu pilih <b>WalletConnect</b> untuk Bitget / OKX.
        </p>
      </div>
    </div>
  );
}
