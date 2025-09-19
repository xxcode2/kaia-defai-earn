// app/analytics/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

/** =========================
 *  Types
 *  ========================= */
type TVLSnapshot = { ts: number; tvl: number }; // unix ms + TVL in USDT
type FlowPoint = { ts: number; deposit: number; withdraw: number }; // per-day volume
type MissionSummary = { id: string; title: string; completionPct: number }; // 0..1
type Referrer = { address: string; referred: number; tvl: number };

type ConnectFunnel = {
  // counts over date range
  click: number;
  modalOpen: number;
  deeplinkOk: number;
  connected: number;
  // split source
  bySource: { liff: number; web: number };
};

type PerfStats = {
  errorRatePct: number;           // 0..100
  medianConnectMs: number;        // ms
  txSuccessPct: number;           // 0..100
};

type AnalyticsData = {
  // hero cards
  tvl: number;
  dau: number;
  wau: number;
  depositsTotal: number;
  withdrawalsTotal: number;

  // time series
  tvlSeries: TVLSnapshot[];       // daily (sorted asc)
  flowSeries: FlowPoint[];        // daily (sorted asc)

  // splits & funnel
  funnel: ConnectFunnel;

  // missions & referrals
  missions: MissionSummary[];
  topReferrers: Referrer[];

  // perf
  perf: PerfStats;

  // meta
  updatedAt: number;
  fromBlock?: number;
};

/** =========================
 *  Fake fetch (ganti dgn API kamu)
 *  ========================= */
async function fetchAnalytics(rangeDays: number): Promise<AnalyticsData> {
  // Dummy generator → ganti dengan fetch('/api/analytics?range=...').then(r => r.json())
  const now = Date.now();
  const days = rangeDays;
  const seed = 650;
  const tvlSeries: TVLSnapshot[] = Array.from({ length: days }).map((_, i) => {
    const ts = now - (days - 1 - i) * 86400000;
    const noise = Math.sin(i / 3) * 50 + Math.random() * 20;
    return { ts, tvl: Math.max(200, seed + i * 5 + noise) };
  });

  const flowSeries: FlowPoint[] = tvlSeries.map((p, i) => {
    const dep = Math.max(0, 120 + Math.sin(i / 2) * 80 + Math.random() * 40);
    const wdr = Math.max(0, 100 + Math.cos(i / 2.5) * 70 + Math.random() * 35);
    return { ts: p.ts, deposit: Math.round(dep), withdraw: Math.round(wdr) };
  });

  const missions: MissionSummary[] = [
    { id: 'm1', title: 'Connect Wallet', completionPct: 0.78 },
    { id: 'm2', title: 'First Deposit ≥ 50 USDT', completionPct: 0.42 },
    { id: 'm3', title: 'Try Withdraw', completionPct: 0.35 },
    { id: 'm4', title: 'Reach 500 USDT (personal)', completionPct: 0.18 },
    { id: 'm5', title: 'Reach 1,000 USDT (personal)', completionPct: 0.09 },
  ];

  const topReferrers: Referrer[] = [
    { address: '0x12ab…cd34', referred: 18, tvl: 5200 },
    { address: '0xbeef…c0de', referred: 13, tvl: 4100 },
    { address: '0xaaaa…bbbb', referred: 9, tvl: 2300 },
    { address: '0x7777…9999', referred: 7, tvl: 1700 },
    { address: '0x1111…2222', referred: 5, tvl: 1200 },
  ];

  const depositsTotal = flowSeries.reduce((s, x) => s + x.deposit, 0);
  const withdrawalsTotal = flowSeries.reduce((s, x) => s + x.withdraw, 0);
  const dau = Math.round(150 + Math.random() * 40);
  const wau = Math.round(600 + Math.random() * 120);

  const liff = 62; // %
  const funnel: ConnectFunnel = {
    click: 1000,
    modalOpen: 850,
    deeplinkOk: 590,
    connected: 540,
    bySource: { liff: Math.round((liff / 100) * 540), web: Math.round(((100 - liff) / 100) * 540) }
  };

  const perf: PerfStats = {
    errorRatePct: 5.8,
    medianConnectMs: 1800,
    txSuccessPct: 94.3
  };

  return {
    tvl: tvlSeries.at(-1)?.tvl ?? seed,
    dau,
    wau,
    depositsTotal,
    withdrawalsTotal,
    tvlSeries,
    flowSeries,
    missions,
    topReferrers,
    funnel,
    perf,
    updatedAt: now,
    fromBlock: 196_058_363
  };
}

/** =========================
 *  Small helpers
 *  ========================= */
const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const money = (n: number) => `${fmt.format(Math.round(n))} USDT`;
const shortAddr = (a: string) => a.replace(/^(.{6}).+(.{4})$/, '$1…$2');

function useAutoRefresh<T>(loader: () => Promise<T>, dep: any[], intervalMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      try {
        const d = await loader();
        if (alive) setData(d);
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    if (intervalMs && intervalMs > 0) {
      const id = setInterval(run, intervalMs);
      return () => {
        alive = false;
        clearInterval(id);
      };
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dep);
  return { data, loading, setData };
}

/** =========================
 *  SVG Micro charts (no deps)
 *  ========================= */
function AreaSparkline({ points, width = 220, height = 56 }: { points: number[]; width?: number; height?: number }) {
  if (!points.length) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const pad = 4;
  const W = width, H = height;
  const span = Math.max(1, max - min);
  const step = (W - pad * 2) / (points.length - 1);

  const path = points.map((v, i) => {
    const x = pad + i * step;
    const y = H - pad - ((v - min) / span) * (H - pad * 2);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');

  const last = points.at(-1)!;
  const first = points[0];
  const dirUp = last >= first;

  return (
    <svg width={W} height={H}>
      {/* fill */}
      <path d={`${path} L ${W - pad},${H - pad} L ${pad},${H - pad} Z`} fill={dirUp ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)'} />
      {/* line */}
      <path d={path} fill="none" stroke={dirUp ? 'rgb(16,185,129)' : 'rgb(239,68,68)'} strokeWidth={2} />
    </svg>
  );
}

function Bars({ series, width = 420, height = 100, maxValue }: {
  series: { a: number; b: number }[]; width?: number; height?: number; maxValue?: number;
}) {
  if (!series.length) return null;
  const pad = 6, W = width, H = height;
  const barW = Math.max(2, (W - pad * 2) / series.length - 2);
  const max = maxValue ?? Math.max(...series.flatMap(s => [s.a, s.b, 1]));
  return (
    <svg width={W} height={H}>
      {series.map((s, i) => {
        const x = pad + i * (barW + 2);
        const hA = (s.a / max) * (H - pad * 2);
        const hB = (s.b / max) * (H - pad * 2);
        return (
          <g key={i}>
            <rect x={x} y={H - pad - hA} width={barW} height={hA} fill="rgba(16,185,129,.9)" />
            <rect x={x} y={H - pad - hA - hB} width={barW} height={hB} fill="rgba(59,130,246,.7)" />
          </g>
        );
      })}
    </svg>
  );
}

/** =========================
 *  Analytics Page
 *  ========================= */
export default function AnalyticsPage() {
  const [range, setRange] = useState<7 | 30 | 90>(7);
  const [auto, setAuto] = useState(true);

  const { data, loading } = useAutoRefresh<AnalyticsData>(
    () => fetchAnalytics(range), [range, auto], auto ? 60_000 : undefined
  );

  const tvlSpark = useMemo(() => (data?.tvlSeries ?? []).map(p => p.tvl), [data]);
  const flowBars = useMemo(() => (data?.flowSeries ?? []).map(p => ({ a: p.deposit, b: p.withdraw })), [data]);
  const net24h = useMemo(() => {
    if (!data?.flowSeries?.length) return 0;
    const last = data.flowSeries.at(-1)!;
    return last.deposit - last.withdraw;
  }, [data]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Analytics</h1>

        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value) as any)}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value={7}>Last 7d</option>
            <option value={30}>Last 30d</option>
            <option value={90}>Last 90d</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Auto-refresh
          </label>
          <button
            onClick={() => location.reload()}
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm hover:bg-emerald-700"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="TVL (USDT)" note={`Updated ${data ? new Date(data.updatedAt).toLocaleString() : '—'}`}>
          <div className="text-4xl font-semibold">{data ? money(data.tvl) : '—'}</div>
          <div className="mt-2"><AreaSparkline points={tvlSpark} /></div>
        </Card>

        <Card title="DAU / WAU">
          <div className="text-3xl font-semibold">{data ? fmt.format(data.dau) : '—'}</div>
          <div className="text-slate-500 text-sm">Last 7/30 days: <b>{data ? fmt.format(data.wau) : '—'}</b></div>
        </Card>

        <Card title="Net Flow (24h)">
          <div className={`text-3xl font-semibold ${net24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {net24h >= 0 ? '+' : ''}{data ? fmt.format(net24h) : '—'}
          </div>
          <div className="text-slate-500 text-sm">Deposits vs Withdrawals</div>
        </Card>

        <Card title="Error rate">
          <div className="text-3xl font-semibold">{data ? data.perf.errorRatePct.toFixed(1) : '—'}%</div>
          <div className="text-slate-500 text-sm">Tx success {data ? data.perf.txSuccessPct.toFixed(1) : '—'}%</div>
        </Card>
      </section>

      {/* TVL & Flows */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title={`TVL over time (${range}d)`}>
          <div className="mb-2 text-sm text-slate-600">Area = TVL</div>
          <div className="rounded-lg bg-white/70 border p-2">
            <AreaSparkline points={tvlSpark} width={520} height={140} />
          </div>
        </Card>

        <Card title="Deposits vs Withdrawals">
          <div className="mb-2 text-sm text-slate-600">Green = Deposit, Blue = Withdraw</div>
          <div className="rounded-lg bg-white/70 border p-2">
            <Bars series={flowBars} width={520} height={140} />
          </div>
          <div className="mt-3 text-sm text-slate-600">
            Total Deposits: <b>{data ? money(data.depositsTotal) : '—'}</b> ·
            Total Withdrawals: <b>{data ? money(data.withdrawalsTotal) : '—'}</b>
          </div>
        </Card>
      </section>

      {/* Sources + Funnel */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Source of connections (LIFF vs Web)">
          <div className="flex items-center gap-8">
            <Donut
              parts={[
                { label: 'LIFF', value: data?.funnel.bySource.liff ?? 0, color: 'rgb(16,185,129)' },
                { label: 'Web', value: data?.funnel.bySource.web ?? 0, color: 'rgb(59,130,246)' },
              ]}
            />
            <div className="space-y-2 text-sm">
              <Legend color="rgb(16,185,129)" label="LIFF" value={data?.funnel.bySource.liff} />
              <Legend color="rgb(59,130,246)" label="Web" value={data?.funnel.bySource.web} />
            </div>
          </div>
        </Card>

        <Card title="Connect funnel">
          <Funnel
            steps={[
              { label: 'Connect clicked', value: data?.funnel.click ?? 0 },
              { label: 'Modal open', value: data?.funnel.modalOpen ?? 0 },
              { label: 'Deep-link OK', value: data?.funnel.deeplinkOk ?? 0 },
              { label: 'Connected', value: data?.funnel.connected ?? 0 },
            ]}
          />
          <div className="text-xs text-slate-500 mt-2">
            Tip: kalau banyak drop di “Deep-link OK”, biasanya WebView LINE memblokir WalletConnect deeplink. Tampilkan prompt “Open in external browser”.
          </div>
        </Card>
      </section>

      {/* Missions + Referrals */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Missions completion">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(data?.missions ?? []).map(m => (
              <div key={m.id} className="rounded-xl border p-3 bg-white/70">
                <div className="text-sm">{m.title}</div>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${(m.completionPct * 100).toFixed(0)}%` }}
                  />
                </div>
                <div className="text-xs text-slate-600 mt-1">{(m.completionPct * 100).toFixed(0)}% completed</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Top referrers">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left py-2">Address</th>
                <th className="text-right">Referred</th>
                <th className="text-right">TVL</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topReferrers ?? []).map((r, i) => (
                <tr key={i} className="[&:not(:last-child)]:border-b border-black/5">
                  <td className="py-2">{shortAddr(r.address)}</td>
                  <td className="text-right">{fmt.format(r.referred)}</td>
                  <td className="text-right">{money(r.tvl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Perf */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Median connect time">
          <div className="text-3xl font-semibold">{data ? (data.perf.medianConnectMs / 1000).toFixed(1) : '—'}s</div>
          <div className="text-sm text-slate-500">Target &lt; 2s</div>
        </Card>
        <Card title="Tx success">
          <div className="text-3xl font-semibold">{data ? data.perf.txSuccessPct.toFixed(1) : '—'}%</div>
          <div className="text-sm text-slate-500">On-chain</div>
        </Card>
        <Card title="Notes">
          <ul className="text-sm list-disc pl-5 text-slate-600">
            <li>Data ini contoh. Sambungkan ke storage harian TVL untuk grafik akurat.</li>
            <li>Funnel penting buat debug WalletConnect di LIFF.</li>
          </ul>
        </Card>
      </section>

      <footer className="text-xs text-slate-500">
        Updated: {data ? new Date(data.updatedAt).toLocaleString() : '—'}
        {data?.fromBlock ? ` · From block ${fmt.format(data.fromBlock)}` : null}
        {loading ? ' · Refreshing…' : null}
      </footer>
    </main>
  );
}

/** =========================
 *  Small presentational bits
 *  ========================= */
function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur px-4 py-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-medium">{title}</div>
        {note ? <div className="text-xs text-slate-500">{note}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Donut({ parts, size = 140 }: { parts: { label: string; value: number; color: string }[]; size?: number }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const radius = size / 2;
  const stroke = 20;
  const C = 2 * Math.PI * (radius - stroke / 2);
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {parts.map((p, i) => {
        const ratio = p.value / total;
        const dash = C * ratio;
        const gap = C - dash;
        const rot = (acc / total) * 360;
        acc += p.value;
        return (
          <circle
            key={i}
            cx={radius}
            cy={radius}
            r={radius - stroke / 2}
            fill="none"
            stroke={p.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            transform={`rotate(${rot} ${radius} ${radius})`}
            strokeLinecap="butt"
          />
        );
      })}
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="text-sm fill-slate-800">
        {total ? '100%' : '—'}
      </text>
    </svg>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value?: number }) {
  const box = { width: 10, height: 10 };
  return (
    <div className="flex items-center gap-2">
      <span style={{ background: color, ...box }} className="inline-block rounded" />
      <span>{label}</span>
      <span className="ml-2 text-slate-500">{value !== undefined ? fmt.format(value) : '—'}</span>
    </div>
  );
}

function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(...steps.map(s => s.value), 1);
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const pct = (s.value / max) * 100;
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-sm">
              <span>{s.label}</span>
              <span className="text-slate-600">{fmt.format(s.value)}</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
