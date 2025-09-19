'use client'

import { useAccount, useDisconnect } from 'wagmi'
import { useEffect, useRef, useState } from 'react'
import { openExternalBrowser, isInAppWebView } from './OpenExternal'
import { getAccount, watchAccount } from 'wagmi/actions'
import { wagmiConfig } from './Web3Root'

const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')

export default function ConnectWalletButton() {
  const { address, isConnecting } = useAccount()
  const { disconnect } = useDisconnect()
  const [modalReady, setModalReady] = useState(false)
  const pollingRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setModalReady(Boolean((window as any).__W3M_INITIALIZED__))

    // watch address changes → simpan ke localStorage agar halaman lain bisa baca
    const unwatch = watchAccount(wagmiConfig, {
      onChange(acc) {
        if (typeof window === 'undefined') return
        if (acc?.address) localStorage.setItem('moreearn.lastAddress', acc.address)
      },
    })
    return () => unwatch?.()
  }, [])

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }
  const startPolling = () => {
    let tries = 0
    stopPolling()
    pollingRef.current = window.setInterval(() => {
      const acc = getAccount(wagmiConfig)
      if (acc?.address) stopPolling()
      if (++tries > 12) stopPolling() // ~6s
    }, 500)
  }

  const openModal = () => {
    if (isInAppWebView()) {
      openExternalBrowser()
      return
    }
    const open = (window as any).__W3M_OPEN__
    if (typeof open === 'function') {
      startPolling()
      open({ view: 'Connect' })
    } else {
      alert('Wallet modal belum siap. Muat ulang halaman & periksa NEXT_PUBLIC_WC_PROJECT_ID.')
    }
  }

  if (!address) {
    return (
      <button
        onClick={openModal}
        disabled={isConnecting || !modalReady}
        className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-50"
      >
        {isConnecting ? 'Connecting…' : 'Connect'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium px-3 py-1 rounded-lg bg-gray-100">{short(address)}</span>
      <button onClick={() => disconnect()} className="px-3 py-2 rounded-xl border hover:bg-gray-50">
        Disconnect
      </button>
    </div>
  )
}
