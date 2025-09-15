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

/** Format angka aman (null/undefined/NaN -> "—") */
function nfmt(n: unknown, dp = 0) {
  if (n === null || n === undefined) return "—";
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: dp,
  });
}

/** Validasi bentuk payload API supaya gak bikin UI crash */
function normalizeStats(x: any): Stats {
  return {
    tvl:
      x && typeof x.tvl === "number" && Number.isFinite(x.tvl)
        ? x.tvl
        : x?.tvl === null
        ? null
        : null,
    users:
      x && typeof x.users === "number" && Number.isFinite(x.users) ? x.users : 0,
    totalDeposits:
      x && typeof x.totalDeposits === "number" && Number.isFinite(x.totalDeposits)
        ? x.totalDeposits
        : 0,
    totalWithdraws:
      x && typeof x.totalWithdraws === "number" && Number.isFinite(x.totalWithdraws)
        ? x.totalWithdraws
        : 0,
    updatedAt: x?.updatedAt || new Date().toISOString(),
    fromBlock:
      typeof x?.fromBlock === "number" && Number.isFinite(x.fromBlock) ? x.fromBlock : 0,
  };
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/analytics", { cache: "no-store" });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || js?.error) {
        setErr(js?.error || `Request failed: ${res.status}`);
        setStats(
          normalizeStats({
            tvl: null,
            users: 0,
            totalDeposits: 0,
            totalWithdraws: 0,
            fromBlock: 0,
          })
        );
      } else {
        setStats(normalizeStats(js));
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load analytics");
      setStats(
        normalizeStats({
          tvl: null,
          users: 0,
          totalDeposits: 0,
          totalWithdraws: 0,
          fromBlock: 0,
        })
      );
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

      {err && (
        <div className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          {err}
        </div>
      )}

      {!stats ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card
              title="TVL (USDT)"
              value={stats.tvl === null ? "—" : nfmt(stats.tvl, 0)}
              hint="Balance USDT di vault (read-only RPC)"
            />
            <Card title="Users" value={nfmt(stats.users)} />
            <Card title="Total Deposits" value={nfmt(stats.totalDeposits)} />
            <Card title="Total Withdrawals" value={nfmt(stats.totalWithdraws)} />
          </div>

          <div className="text-xs text-gray-500 mt-4">
            Updated: {new Date(stats.updatedAt).toLocaleString()} · From block {nfmt(stats.fromBlock)}
          </div>

          {/* Minimal sparkline placeholder (no historical cache yet) */}
          <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm border">
            <div className="text-sm font-medium mb-2">TVL snapshot</div>
            <div className="text-[12px] text-gray-500">
              Saat ini hanya menampilkan TVL terkini. Untuk sparkline, simpan snapshot harian lalu render sebagai mini chart.
            </div>
            <svg viewBox="0 0 300 80" className="w-full mt-3">
              <rect x="0" y="0" width="300" height="80" fill="#f9fafb" />
              <text x="10" y="25" fontSize="12" fill="#111827">
                TVL
              </text>
              <text x="10" y="50" fontSize="18" fontWeight="700" fill="#0f766e">
                {stats.tvl === null ? "—" : `${nfmt(stats.tvl)} USDT`}
              </text>
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
