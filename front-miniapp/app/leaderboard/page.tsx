"use client";
import { useEffect, useState } from "react";

type Row = { referrer: string; invites: number; tvl: number };

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (loading) return;
    setLoading(true);
    try {
      const r = await fetch("/api/referrals?limit=50", { cache: "no-store" });
      const j = await r.json();
      setRows(j?.rows || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <span>🏆</span> Leaderboard
        </h1>
        <button
          onClick={load}
          disabled={loading}
          className={`px-4 py-2 rounded-md text-white ${
            loading ? "bg-gray-300" : "bg-teal-500 hover:bg-teal-600"
          }`}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-4 py-3 w-16">Rank</th>
              <th className="px-4 py-3">Referrer</th>
              <th className="px-4 py-3 w-24">Invites</th>
              <th className="px-4 py-3 w-40">TVL (USDT)</th>
            </tr>
          </thead>
          <tbody>
            {!rows || rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={4}>
                  {loading ? "Loading..." : "No data yet."}
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.referrer} className="border-t">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3 font-mono">
                    {r.referrer.slice(0, 6)}…{r.referrer.slice(-4)}
                  </td>
                  <td className="px-4 py-3">{r.invites}</td>
                  <td className="px-4 py-3">
                    {r.tvl.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        *Perhitungan berdasarkan klaim <i>first deposit</i> dari user yang datang via <code>?ref=0x…</code>.
      </p>
    </div>
  );
}

