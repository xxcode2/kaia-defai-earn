'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { createPublicClient, http, parseAbi, formatUnits, Address, Hex } from 'viem';

const RPC = process.env.NEXT_PUBLIC_RPC_HTTP!;
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1001);
const USDT = (process.env.NEXT_PUBLIC_USDT || '').toLowerCase() as Address;
const VAULT = (process.env.NEXT_PUBLIC_VAULT || '').toLowerCase() as Address;
const FROM_BLOCK = BigInt(process.env.NEXT_PUBLIC_VAULT_FROM_BLOCK || '0'); // contoh: 196058363

// ABI minimum untuk baca ERC20 & event Transfer
const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
]);

// batas chunk getLogs agar RPC gak ke-throttle
const BLOCK_CHUNK = 7_500n;

type Totals = {
  tvl: string;             // formatted
  users: number;           // unique depositors
  deposits: string;        // formatted
  withdrawals: string;     // formatted
  updatedAt: string;
  fromBlock: bigint;
  toBlock: bigint;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const client = useMemo(
    () =>
      createPublicClient({
        transport: http(RPC),
      }),
    []
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      if (!USDT || !VAULT) throw new Error('ENV USDT/VAULT belum diset');

      // 1) decimals USDT
      const decimals = await client.readContract({
        address: USDT,
        abi: ERC20_ABI,
        functionName: 'decimals'
      }) as number;

      // 2) TVL = balanceOf(vault)
      const bal = await client.readContract({
        address: USDT,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [VAULT]
      }) as bigint;
      const tvlFmt = formatUnits(bal, decimals);

      // 3) Ambil block terbaru
      const latestBlock = await client.getBlockNumber();

      // 4) Ambil semua event Transfer (to=VAULT) & (from=VAULT) dalam chunk
      let depositsSum = 0n;
      let withdrawalsSum = 0n;
      const uniqueDepositors = new Set<string>();

      const topicTransfer: Hex = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' as Hex;
      // (di viem sebenarnya tidak wajib manual topic kalau pakai decodeLogs via abi)

      let from = FROM_BLOCK > 0 ? FROM_BLOCK : latestBlock - 50_000n;
      if (from < 0) from = 0n;
      let to = latestBlock;

      for (let start = from; start <= to; start += BLOCK_CHUNK + 1n) {
        const end = start + BLOCK_CHUNK > to ? to : start + BLOCK_CHUNK;

        // Deposit = Transfer(to == VAULT)
        const depLogs = await client.getLogs({
          address: USDT,
          fromBlock: start,
          toBlock: end,
          event: {
            type: 'event',
            name: 'Transfer',
            inputs: [
              { indexed: true, name: 'from', type: 'address' },
              { indexed: true, name: 'to', type: 'address' },
              { indexed: false, name: 'value', type: 'uint256' }
            ]
          } as any,
          args: { to: VAULT }
        });

        for (const lg of depLogs as any[]) {
          const value: bigint = lg.args?.value ?? 0n;
          const fromAddr: string = (lg.args?.from as string || '').toLowerCase();
          depositsSum += value;
          if (fromAddr) uniqueDepositors.add(fromAddr);
        }

        // Withdraw = Transfer(from == VAULT)
        const wLogs = await client.getLogs({
          address: USDT,
          fromBlock: start,
          toBlock: end,
          event: {
            type: 'event',
            name: 'Transfer',
            inputs: [
              { indexed: true, name: 'from', type: 'address' },
              { indexed: true, name: 'to', type: 'address' },
              { indexed: false, name: 'value', type: 'uint256' }
            ]
          } as any,
          args: { from: VAULT }
        });

        for (const lg of wLogs as any[]) {
          const value: bigint = lg.args?.value ?? 0n;
          withdrawalsSum += value;
        }
      }

      const totals: Totals = {
        tvl: `${formatNumber(tvlFmt)} USDT`,
        users: uniqueDepositors.size,
        deposits: `${formatNumber(formatUnits(depositsSum, decimals))} USDT`,
        withdrawals: `${formatNumber(formatUnits(withdrawalsSum, decimals))} USDT`,
        updatedAt: new Date().toLocaleString(),
        fromBlock: from,
        toBlock: latestBlock
      };

      setData(totals);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="px-3 py-2 rounded-xl text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {err && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {err}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="TVL (USDT)" value={data?.tvl ?? '—'} hint="Saldo USDT di vault (real-time)" />
        <StatCard title="Users" value={data ? String(data.users) : '—'} hint="Unique depositors (sejak FROM_BLOCK)" />
        <StatCard title="Total Deposits" value={data?.deposits ?? '—'} hint="Akumulasi Transfer → VAULT" />
        <StatCard title="Total Withdrawals" value={data?.withdrawals ?? '—'} hint="Akumulasi Transfer ← VAULT" />
      </section>

      <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur p-5">
        <h2 className="font-medium mb-2">Detail</h2>
        <ul className="text-sm text-slate-600 space-y-1">
          <li><strong>Vault</strong>: <code className="text-xs">{VAULT || '-'}</code></li>
          <li><strong>USDT</strong>: <code className="text-xs">{USDT || '-'}</code></li>
          <li><strong>From block</strong>: {data ? String(data.fromBlock) : (FROM_BLOCK > 0 ? String(FROM_BLOCK) : '—')}</li>
          <li><strong>To block</strong>: {data ? String(data.toBlock) : '—'}</li>
          <li><strong>Updated</strong>: {data?.updatedAt ?? '—'}</li>
        </ul>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Catatan: data di-scan dari event ERC-20 Transfer via RPC Kairos. Jika range sangat panjang,
        pengambilan dilakukan per {Number(BLOCK_CHUNK).toLocaleString()} blok agar stabil.
      </p>
    </main>
  );
}

function StatCard(props: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur p-4">
      <div className="text-xs text-slate-500">{props.title}</div>
      <div className="text-2xl font-semibold mt-1">{props.value}</div>
      {props.hint && <div className="text-xs text-slate-400 mt-1">{props.hint}</div>}
    </div>
  );
}

function formatNumber(x: string) {
  // x adalah string desimal—biar tidak kehilangan presisi besar.
  const [int, frac] = x.split('.');
  const intFmt = Number(int || '0').toLocaleString();
  // tampilkan max 4 desimal yang non-zero
  const f = (frac || '').replace(/0+$/, '');
  return f ? `${intFmt}.${f.slice(0, 4)}` : intFmt;
}
