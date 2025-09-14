"use client";

import { useEffect, useMemo, useState } from "react";
import { getUserActivity, type UserActivity } from "@/lib/activity";

const VAULT = process.env.NEXT_PUBLIC_VAULT!;
const SCOPE =
  (process.env.NEXT_PUBLIC_SCOPE || "https://kairos.scope.kaia.io").replace(
    /\/+$/,
    ""
  );

type Row = {
  block: number;
  type: "Deposit" | "Withdraw";
  user: string;
  amount: number; // mapped from assets
  shares: number;
  tx: string; // mapped from txHash
};

export default function ActivityPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [page, setPage] = useState(1);

  const PER_PAGE = 20;
  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const pageSlice = useMemo(
    () => rows.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [rows, page]
  );

  // util kecil
  const fmt = (n?: number, dp = 6) =>
    n === undefined || n === null || Number.isNaN(n)
      ? "—"
      : Number(n).toLocaleString(undefined, { maximumFractionDigits: dp });
  const short = (addr?: string, left = 6, right = 4) =>
    !addr ? "—" : `${addr.slice(0, left)}…${addr.slice(-right)}`;
  const openInExplorer = (addr?: string) => {
    if (!addr) return;
    window.open(`${SCOPE}/account/${addr}`, "_blank");
  };

  // ambil address dari wallet (kalau ada)
  useEffect(() => {
    async function getAddr() {
      try {
        // @ts-ignore
        const eth = window.ethereum;
        if (!eth) return;
        const accts: string[] = await eth.request({ method: "eth_accounts" });
        if (accts && accts[0]) setAddress(accts[0]);
      } catch {}
    }
    getAddr();
  }, []);

  // fetch activity dari helper lib
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data: UserActivity[] = await getUserActivity(address, VAULT);
        // mapping agar cocok dengan Row
        const mapped: Row[] = data.map((d) => ({
          block: d.blockNumber,
          type: d.type,
          user: d.user,
          amount: d.assets, // assets → amount
          shares: d.shares,
          tx: d.txHash, // txHash → tx
        }));
        setRows(mapped);
        setLastUpdated(new Date().toLocaleTimeString());
        setPage(1);
      } finally {
        setLoading(false);
      }
    }
    // jika alamat belum ada, tetap fetch untuk semua (helper mengabaikan addr bila kosong)
    fetchData();
  }, [address]);

  return (
    <main className="p-4 md:p-8 space-y-4">
      <div className="text-lg font-semibold">Activity</div>

      <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur p-3">
        <div className="overflow-x-auto rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Th>Type</Th>
                <Th>Address</Th>
                <Th right>Assets (USDT)</Th>
                <Th right>Shares</Th>
                <Th>Tx</Th>
              </tr>
            </thead>
            <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-black/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    Loading on-chain activity…
                  </td>
                </tr>
              ) : pageSlice.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No activity.
                  </td>
                </tr>
              ) : (
                pageSlice.map((row, i) => (
                  <Tr key={`${row.tx}-${i}`}>
                    <Td>{row.type}</Td>
                    <Td>
                      <a
                        className="text-emerald-600 hover:underline"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          openInExplorer(row.user);
                        }}
                      >
                        {short(row.user)}
                      </a>
                    </Td>
                    <Td right>{fmt(row.amount, 6)}</Td>
                    <Td right>{fmt(row.shares, 6)}</Td>
                    <Td>
                      <a
                        className="text-emerald-600 hover:underline"
                        target="_blank"
                        href={`${SCOPE}/tx/${row.tx}`}
                        rel="noreferrer"
                      >
                        {short(row.tx)}
                      </a>
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination + meta */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages} · {rows.length} items
            {lastUpdated ? ` · updated ${lastUpdated}` : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              subtle
              size="sm"
              tone="dark"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              subtle
              size="sm"
              tone="dark"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ===== UI micro components (local only) ===== */
function Th({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-medium ${right ? "text-right" : ""}`}>
      {children}
    </th>
  );
}
function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="bg-white/70">{children}</tr>;
}
function Td({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td className={`px-4 py-3 align-middle ${right ? "text-right tabular-nums" : ""}`}>
      {children}
    </td>
  );
}

function Button({
  children,
  onClick,
  size = "md",
  tone = "emerald",
  subtle = false,
  className,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  size?: "md" | "lg" | "sm";
  tone?: "emerald" | "dark";
  subtle?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const sizes = {
    sm: "px-2.5 py-1.5 text-sm",
    md: "px-3 py-2 text-sm",
    lg: "w-full py-3 text-base",
  } as const;
  const tones = {
    emerald: subtle
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
      : "bg-emerald-600 text-white hover:bg-emerald-700",
    dark: subtle
      ? "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200"
      : "bg-slate-900 text-white hover:bg-slate-800",
  } as const;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-xl font-medium shadow-sm border border-transparent active:translate-y-px transition-colors disabled:opacity-60",
        sizes[size],
        tones[tone],
        className || "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
