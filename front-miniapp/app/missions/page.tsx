'use client';

import { useEffect, useState } from 'react';
import type { MissionStatus } from '@/lib/missions';
import { getMissionStatus } from '@/lib/missions';
import ConnectWalletButton from '@/components/ConnectWalletButton';

// util kecil buat shorten address
function short(addr?: string) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function MissionsPage() {
  const [address, setAddress] = useState<string>('');
  const [status, setStatus] = useState<MissionStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // listener untuk event wallet_connected (dari ConnectWalletButton)
  useEffect(() => {
    const handler = (ev: any) => {
      const accs: string[] = ev?.detail?.accounts || [];
      if (accs.length > 0) setAddress(accs[0]);
    };
    window.addEventListener('wallet_connected', handler as any);
    return () => window.removeEventListener('wallet_connected', handler as any);
  }, []);

  async function load() {
    if (!address) {
      setStatus(null);
      return;
    }
    setLoading(true);
    try {
      const res = await getMissionStatus(address);
      if (res) setStatus(res);
      else setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const rows = [
    { id: 'm1', title: 'Connect Wallet' },
    { id: 'm2', title: 'First Deposit ≥ 50 USDT' },
    { id: 'm3', title: 'Try Withdraw' },
    { id: 'm4', title: 'Reach 500 USDT (personal)' },
    { id: 'm5', title: 'Reach 1,000 USDT (personal)' },
    { id: 'm6', title: 'Make 3 Deposits' },
    { id: 'm7', title: 'Stay Staked for 7 days' },
    { id: 'm8', title: 'Use Locked (Demo) once' },
    { id: 'm9', title: 'Top 100 Leaderboard (any time)' },
    { id: 'm10', title: 'Share Referral Link' },
  ] as const;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Missions</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {address ? short(address) : 'Not connected'}
          </span>
          {!address ? (
            <ConnectWalletButton />
          ) : (
            <button
              onClick={() => setAddress('')}
              className="px-3 py-2 rounded-xl text-sm bg-slate-900 text-white hover:bg-slate-800"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left">Mission</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-black/5">
              {rows.map((r) => {
                const done = status ? (status as any)[r.id] === true : false;
                return (
                  <tr key={r.id} className="bg-white/70">
                    <td className="px-4 py-3">{r.title}</td>
                    <td className="px-4 py-3">
                      {loading ? (
                        <span className="text-slate-500">Checking…</span>
                      ) : done ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs">
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 text-xs">
                          In progress
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {address && !loading && status === null && (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={2}>
                    Belum ada data mission di perangkat ini.
                  </td>
                </tr>
              )}
              {!address && (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={2}>
                    Connect wallet untuk melihat progress missions kamu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Catatan: Mission ini dibaca dari data lokal (localStorage) yang juga
        dipakai di halaman utama.
      </p>
    </div>
  );
}
