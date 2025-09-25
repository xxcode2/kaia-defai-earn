'use client';

import { useEffect, useMemo, useState } from 'react'
import { Address, createPublicClient, http, parseUnits, formatUnits } from 'viem'
import {
  useAccount, useChainId, useChains, useSwitchChain,
  useReadContract, useWriteContract
} from 'wagmi'

const ERC20 = [
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{type:'uint8'}] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{name:'owner',type:'address'}], outputs: [{type:'uint256'}] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{name:'owner',type:'address'},{name:'spender',type:'address'}], outputs: [{type:'uint256'}] },
  { type: 'function', name: 'approve',   stateMutability: 'nonpayable', inputs: [{name:'spender',type:'address'},{name:'value',type:'uint256'}], outputs: [{type:'bool'}] }
] as const

const ROUTER_ABI = [
  { type:'function', name:'getAmountsOut', stateMutability:'view',
    inputs:[{name:'amountIn',type:'uint256'},{name:'path',type:'address[]'}],
    outputs:[{type:'uint256[]'}]
  },
  { type:'function', name:'swapExactTokensForTokens', stateMutability:'nonpayable',
    inputs:[
      {name:'amountIn',type:'uint256'},
      {name:'amountOutMin',type:'uint256'},
      {name:'path',type:'address[]'},
      {name:'to',type:'address'},
      {name:'deadline',type:'uint256'}
    ],
    outputs:[{type:'uint256[]'}]
  }
] as const

function envFor(chainId: number, key: 'ROUTER'|'TOKEN_IN'|'TOKEN_OUT') {
  const k = `NEXT_PUBLIC_${key}_${chainId}`
  return (process.env[k] || '') as Address
}

export default function Swap() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const chains = useChains()
  const target = chains.find(c => c.id === chainId) || chains[0]
  const { switchChain } = useSwitchChain()
  const { writeContractAsync, isPending: isWriting } = useWriteContract()

  const ROUTER = envFor(target?.id ?? 0, 'ROUTER')
  const TOKEN_IN = envFor(target?.id ?? 0, 'TOKEN_IN')
  const TOKEN_OUT = envFor(target?.id ?? 0, 'TOKEN_OUT')

  // fallback RPC dari definisi chain
  const RPC = target?.rpcUrls?.default?.http?.[0] || ''

  const client = useMemo(() => createPublicClient({ transport: http(RPC) }), [RPC])
  const [decIn, setDecIn] = useState<number>(6)
  const [decOut, setDecOut] = useState<number>(18)
  const [amountIn, setAmountIn] = useState<string>('10')
  const [quoteOut, setQuoteOut] = useState<string>('0')
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setErr(null)
    setQuoteOut('0')
  }, [ROUTER, TOKEN_IN, TOKEN_OUT, RPC, chainId])

  // decimals
  useEffect(() => {
    (async () => {
      try {
        if (!TOKEN_IN || !TOKEN_OUT) return
        const [dIn, dOut] = await Promise.all([
          client.readContract({ address: TOKEN_IN, abi: ERC20, functionName:'decimals' }) as Promise<number>,
          client.readContract({ address: TOKEN_OUT, abi: ERC20, functionName:'decimals' }) as Promise<number>,
        ])
        setDecIn(Number(dIn)); setDecOut(Number(dOut))
      } catch (e: any) {
        setErr(e?.message || 'Failed read decimals')
      }
    })()
  }, [client, TOKEN_IN, TOKEN_OUT])

  const { data: allowance } = useReadContract({
    address: TOKEN_IN, abi: ERC20, functionName: 'allowance',
    args: [address as Address, ROUTER],
    query: { enabled: !!address && !!TOKEN_IN && !!ROUTER }
  })

  const { data: balIn } = useReadContract({
    address: TOKEN_IN, abi: ERC20, functionName: 'balanceOf',
    args: [address as Address],
    query: { enabled: !!address && !!TOKEN_IN }
  })

  async function refreshQuote() {
    if (!amountIn || Number(amountIn) <= 0) { setQuoteOut('0'); return }
    if (!ROUTER || !TOKEN_IN || !TOKEN_OUT) return
    setLoadingQuote(true); setErr(null)
    try {
      const amtIn = parseUnits(amountIn, decIn)
      const out = await client.readContract({
        address: ROUTER, abi: ROUTER_ABI, functionName: 'getAmountsOut',
        args: [amtIn, [TOKEN_IN, TOKEN_OUT]]
      }) as bigint[]
      const last = out?.[out.length-1] ?? 0n
      setQuoteOut(formatUnits(last, decOut))
    } catch (e: any) {
      setQuoteOut('0')
      setErr(e?.message || 'Failed to quote')
    } finally {
      setLoadingQuote(false)
    }
  }
  useEffect(() => { refreshQuote() }, [amountIn, decIn, decOut, ROUTER, TOKEN_IN, TOKEN_OUT])

  async function ensureChain() {
    if (target && chainId !== target.id) await switchChain({ chainId: target.id })
  }

  async function onApprove() {
    if (!address) return alert('Connect wallet first')
    if (!TOKEN_IN || !ROUTER) return alert('Token/Router not set for this chain')
    try {
      await ensureChain()
      const amtIn = parseUnits(amountIn || '0', decIn)
      await writeContractAsync({
        address: TOKEN_IN,
        abi: ERC20,
        functionName: 'approve',
        args: [ROUTER, amtIn]
      })
    } catch (e: any) {
      alert(e?.message || 'Approve failed')
    }
  }

  async function onSwap() {
    if (!address) return alert('Connect wallet first')
    if (!ROUTER || !TOKEN_IN || !TOKEN_OUT) return alert('Router/Token not set for this chain')
    try {
      await ensureChain()
      const amtIn = parseUnits(amountIn || '0', decIn)
      if (amtIn === 0n) return
      const expOut = parseUnits(quoteOut || '0', decOut)
      const minOut = (expOut * 995n) / 1000n // 0.5% slippage
      const deadline = BigInt(Math.floor(Date.now()/1000) + 60*10)

      await writeContractAsync({
        address: ROUTER,
        abi: ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [amtIn, minOut, [TOKEN_IN, TOKEN_OUT], address as Address, deadline]
      })
      alert('Swap submitted!')
    } catch (e: any) {
      alert(e?.message || 'Swap failed')
    }
  }

  const needApprove = (() => {
    try {
      const need = (allowance as bigint ?? 0n) < parseUnits(amountIn || '0', decIn)
      return need
    } catch { return true }
  })()

  const balanceFmt = useMemo(() => {
    try { return balIn ? Number(formatUnits(balIn as bigint, decIn)).toLocaleString() : '—' }
    catch { return '—' }
  }, [balIn, decIn])

  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur p-4 space-y-3">
      <div className="text-sm text-slate-500">Swap (Uniswap V2 style)</div>
      {err && <div className="text-xs text-red-600">{err}</div>}

      <div className="grid gap-3">
        <label className="text-xs text-slate-500">
          Amount In ({(TOKEN_IN || '').slice(0,6)}…)
        </label>
        <input
          value={amountIn} onChange={(e) => setAmountIn(e.target.value)}
          className="px-3 py-2 rounded-xl border"
          placeholder="10"
          inputMode="decimal"
        />

        <div className="text-xs text-slate-500">
          Balance: {balanceFmt}
        </div>

        <div className="text-sm">
          ≈ Output ({(TOKEN_OUT || '').slice(0,6)}…): {loadingQuote ? '…' : quoteOut}
        </div>
      </div>

      {!isConnected ? (
        <div className="text-sm text-slate-500">Connect wallet first.</div>
      ) : needApprove ? (
        <button
          onClick={onApprove}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          disabled={isWriting}
        >
          {isWriting ? 'Approving…' : 'Approve'}
        </button>
      ) : (
        <button
          onClick={onSwap}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          disabled={isWriting}
        >
          {isWriting ? 'Swapping…' : 'Swap'}
        </button>
      )}
    </div>
  )
}
