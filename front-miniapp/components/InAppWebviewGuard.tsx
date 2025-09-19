'use client'
import { isInAppWebView } from './OpenExternal'
import { openExternalBrowser, copyCurrentUrl } from './OpenExternal'
import { useMemo } from 'react'

export default function InAppWebviewGuard({ children }: { children: React.ReactNode }) {
  const inApp = useMemo(() => isInAppWebView(), [])
  if (!inApp) return <>{children}</>

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="max-w-sm w-full space-y-4 text-center">
        <h1 className="text-lg font-semibold">Buka di Browser Eksternal</h1>
        <p className="text-sm text-slate-600">
          WebView (LINE/Telegram) membatasi WalletConnect. Buka halaman ini di Chrome (Android) atau Safari (iOS).
        </p>
        <button
          onClick={() => openExternalBrowser()}
          className="mt-2 w-full px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Buka di Browser
        </button>
        <button
          onClick={() => copyCurrentUrl()}
          className="w-full px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
        >
          Salin Link
        </button>
        <p className="text-xs text-slate-500">
          Setelah terbuka di browser, tekan <b>Connect</b> lalu pilih <b>WalletConnect</b> (Bitget/OKX).
        </p>
      </div>
    </div>
  )
}
