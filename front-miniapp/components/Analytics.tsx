"use client";
import { useEffect, useMemo, useState } from "react";
import { fetchAnalytics, Summary } from "@/lib/analytics";

const duneTVL = process.env.NEXT_PUBLIC_DUNE_EMBED__TVL || "";
const duneUsers = process.env.NEXT_PUBLIC_DUNE_EMBED__USERS || "";
const duneVolume = process.env.NEXT_PUBLIC_DUNE_EMBED__VOLUME || "";

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-5 rounded-2xl border border-white/10 bg-white/5 shadow">
      <div className="text-sm opacity-70">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs opacity-60">{sub}</div>}
    </div>
  );
}

export default function Analytics() {
  const [sum, setSum] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const hasDune = duneTVL || duneUsers || duneVolume;

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const s = await fetchAnalytics();
        if (on) setSum(s);
      } catch (e: any) {
        setErr(e?.message || "Failed to load analytics");
      }
    })();
    return () => { on = false; };
  }, []);

  const chart = useMemo(() => {
    if (!sum) return null;
    // SVG sparkline TVL
    const w = 600, h = 80, pad = 6;
    const xs = sum.days.map((_, i) => i);
    const ys = sum.days.map((d) => d.net);
    const min = Math.min(...ys, 0);
    const max = Math.max(...ys, 1);
    const x = (i: number) => pad + (i * (w - 2 * pad)) / Math.max(xs.length - 1, 1);
    const y = (v: number) => h - pad - ((v - min) * (h - 2 * pad)) / (max - min || 1);
    const d = sum.days.map((row, i) => `${i ? "L" : "M"}${x(i)},${y(row.net)}`).join(" ");
    return (
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="rounded-xl bg-white/5 border border-white/10">
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }, [sum]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Analytics</h2>

      {err && (
        <div className="p-3 text-sm rounded-lg border border-red-500/30 bg-red-500/10">
          {err}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Metric label="TVL (USDT)" value={sum ? sum.tvl.toLocaleString() : "…"} />
        <Metric label="Volume 7D (USDT)" value={sum ? sum.volume7d.toLocaleString() : "…"} />
        <Metric label="Unique depositors 7D" value={sum ? String(sum.uniqueDepositors7d) : "…"} />
      </div>

      {chart && (
        <div className="space-y-2">
          <div className="text-sm opacity-70">TVL (net inflow cumulative)</div>
          {chart}
        </div>
      )}

      <div className="space-y-2">
        <div className="text-sm opacity-70">Daily net flow (USDT)</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left opacity-70">
              <tr>
                <th className="py-2 pr-4">Date (UTC)</th>
                <th className="py-2 pr-4">Inflow</th>
                <th className="py-2 pr-4">Outflow</th>
                <th className="py-2 pr-4">Net</th>
              </tr>
            </thead>
            <tbody>
              {sum?.days.slice(-30).reverse().map((r) => (
                <tr key={r.date} className="border-t border-white/10">
                  <td className="py-2 pr-4">{r.date}</td>
                  <td className="py-2 pr-4">{r.inflow.toLocaleString()}</td>
                  <td className="py-2 pr-4">{r.outflow.toLocaleString()}</td>
                  <td className="py-2 pr-4">{r.net.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasDune ? (
        <p className="text-xs opacity-60">
          Catatan: Saat pindah ke mainnet, kamu bisa switch ke Dune embed dengan mengisi ENV <code>NEXT_PUBLIC_DUNE_EMBED__*</code>.
        </p>
      ) : (
        <p className="text-xs opacity-60">
          Data ditarik langsung dari RPC Kairos (on-chain). Nanti saat mainnet, tinggal ganti ke Dune embed.
        </p>
      )}
    </div>
  );
}
