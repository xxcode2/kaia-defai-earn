'use client';

import { useEffect } from 'react'
import {
  useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useChains
} from 'wagmi'

function short(addr?: string) {
  if (!addr) return '—'
  return `${addr.slice(0,6)}…${addr.slice(-4)}`
}

export default function ConnectWalletButton() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const chains = useChains()
  const target = chains[0] // default ke chain pertama di config

  const { connectors, connect, isPending: isConnecting, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  // Auto-switch kalau chainnya berbeda
  useEffect(() => {
    if (isConnected && target && chainId !== target.id) {
      switchChain({ chainId: target.id }).catch(() => {})
    }
  }, [isConnected, chainId, target, switchChain])

  if (isConnected && address) {
    const wrong = target && chainId !== target.id
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-1 rounded-lg bg-gray-100">{short(address)}</span>
        {wrong ? (
          <button
            onClick={() => switchChain({ chainId: target.id })}
            className="px-3 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
            disabled={isSwitching}
            title={`Switch to ${target?.name}`}
          >
            {isSwitching ? 'Switching…' : `Switch ${target?.name}`}
          </button>
        ) : (
          <button
            onClick={() => disconnect()}
            className="px-3 py-2 rounded-xl border hover:bg-gray-50"
            title="Disconnect"
          >
            Disconnect
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {connectors.map((c) => (
        <button
          key={c.id}
          onClick={() => connect({ connector: c })}
          className="px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          disabled={isConnecting || !c.ready}
          title={c.name}
        >
          {isConnecting ? 'Connecting…' : `Connect ${c.name}`}
        </button>
      ))}
      {connectError && (
        <span className="text-xs text-red-600">
          {(connectError as any)?.message || 'Connect failed'}
        </span>
      )}
    </div>
  )
}
