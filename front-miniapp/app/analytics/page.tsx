"use client";

import { useEffect, useState } from "react";

type Stats = {
  tvl: number | null;
  users: number;
  totalDeposits: number;
  totalWithdraws: number;
  updatedAt: string;
  fromBlock: number;
};

function Card({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="text-[11px] text-gray-500 mt-1">{hint}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics", { cache: "no-store" });
      const js = await res.json();
      setStats(js);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Analytics</h1>
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

      {!stats ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card
              title="TVL (USDT)"
              value={stats.tvl === null ? "—" : stats.tvl.toLocaleString()}
              hint="From totalAssets(), if available"
            />
            <Card title="Users" value={stats.users.toLocaleString()} />
            <Card
              title="Total Deposits"
              value={stats.totalDeposits.toLocaleString()}
            />
            <Card
              title="Total Withdrawals"
              value={stats.totalWithdraws.toLocaleString()}
            />
          </div>

          <div className="text-xs text-gray-500 mt-4">
            Updated: {new Date(stats.updatedAt).toLocaleString()} · From block{" "}
            {stats.fromBlock}
          </div>

          {/* Minimal sparkline placeholder (no historical cache yet) */}
          <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm border">
            <div className="text-sm font-medium mb-2">TVL sparkline</div>
            <div className="text-[12px] text-gray-500">
              For the demo we render current TVL only. If you want a real
              sparkline, we can store historical snapshots in a flat JSON file
              under <code>/app/api/analytics</code> and append regularly.
            </div>
            <svg viewBox="0 0 300 80" className="w-full mt-3">
              <rect x="0" y="0" width="300" height="80" fill="#f9fafb" />
              <text x="10" y="25" fontSize="12" fill="#111827">
                TVL
              </text>
              <text x="10" y="50" fontSize="18" fontWeight="700" fill="#0f766e">
                {stats.tvl === null ? "—" : stats.tvl.toLocaleString()} USDT
              </text>
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
