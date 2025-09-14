"use client";

import { useEffect, useState } from "react";

type AnalyticsData = {
  depositCount: number;
  withdrawCount: number;
  uniqueUsers: number;
  totalDeposited: number; // USDT
  totalWithdrawn: number; // USDT
  lastBlock?: number;
};

function fmt(n?: number, dp = 2) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: dp });
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await fetch("/api/analytics", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as AnalyticsData;
        setData(j);
      } catch (e: any) {
        setErr(e?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Analytics</h2>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm"
            >
              <div className="h-5 w-24 bg-slate-200/70 rounded mb-2 animate-pulse" />
              <div className="h-7 w-32 bg-slate-200/80 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardStat label="Total Deposits" value={data?.depositCount} />
          <CardStat label="Total Withdrawals" value={data?.withdrawCount} />
          <CardStat label="Unique Users" value={data?.uniqueUsers} />
          <CardStat
            label="Net Inflow (USDT)"
            value={fmt((data?.totalDeposited || 0) - (data?.totalWithdrawn || 0), 2)}
          />
        </div>
      )}

      {!loading && data && (
        <div className="text-xs text-slate-500">
          Last block indexed: <b>{data.lastBlock ?? "—"}</b>
        </div>
      )}
    </div>
  );
}

function CardStat({ label, value }: { label: string; value?: number | string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value ?? "—"}</div>
    </div>
  );
}
