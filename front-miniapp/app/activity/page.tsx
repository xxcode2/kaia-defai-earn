"use client";

import { useEffect, useMemo, useState } from "react";
import { getUserActivity } from "../../lib/activity";

type Row = { type: string; amount: number; tx: string; block: number };

export default function ActivityPage() {
  const [addr, setAddr] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("—");
  const VAULT = useMemo(() => process.env.NEXT_PUBLIC_VAULT || "", []);

  // ambil selected address dari wallet & subscribe perubahan
  useEffect(() => {
    const eth = (window as any).ethereum;
    const init = async () => {
      if (!eth) return;
      try {
        const accts: string[] = await eth.request({ method: "eth_accounts" });
        if (accts && accts[0]) setAddr(accts[0]);
        eth.on?.("accountsChanged", (arr: string[]) => setAddr(arr?.[0] || ""));
      } catch {}
    };
    init();
  }, []);

  async function refresh() {
    if (!addr || !VAULT) return;
    if (loading) return;
    setLoading(true);
    try {
      const data = await getUserActivity(addr, VAULT);
      setRows(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }

  // auto load ketika addr siap
  useEffect(() => {
    if (addr && VAULT) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addr, VAULT]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Activity</h1>
          <p className="text-sm text-gray-500">
            {addr ? (
              <>
                Address:{" "}
                <span className="font-medium">
                  {addr.slice(0, 6)}…{addr.slice(-4)}
                </span>
              </>
            ) : (
              <>Connect wallet on Kairos to view your activity.</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Last update: {lastUpdated}</span>
          <button
            onClick={refresh}
            disabled={loading || !addr}
            className={`px-5 py-2 rounded-md text-white transition ${
              loading || !addr
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-teal-500 hover:bg-teal-600"
            }`}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Content */}
      {rows.length === 0 ? (
        <div className="bg-white border rounded-2xl shadow-sm p-8 text-center text-gray-500">
          {addr ? "No activity found for this address." : "Please connect your wallet."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Amount (USDT)</th>
                <th className="text-left p-3">Block</th>
                <th className="text-left p-3">Transaction</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3 font-medium">{a.type}</td>
                  <td className="p-3">{a.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                  <td className="p-3">#{a.block}</td>
                  <td className="p-3">
                    <a
                      className="text-teal-600 underline"
                      href={`https://kairos.kaiascope.com/tx/${a.tx}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on Explorer
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-gray-500 mt-8">
        Built for{" "}
        <span className="font-semibold">Kaia Wave Stablecoin Summer Hackathon</span>
      </p>
    </div>
  );
}
