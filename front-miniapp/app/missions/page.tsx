"use client";

import { useEffect, useMemo, useState } from "react";
import { getMissionStatus } from "../../lib/missions";

type MissionStatus = { m1: boolean; m2: boolean };

export default function MissionsPage() {
  const [addr, setAddr] = useState<string>("");
  const [status, setStatus] = useState<MissionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const VAULT = useMemo(() => process.env.NEXT_PUBLIC_VAULT || "", []);

  // ambil selected address dari wallet (OKX/Kaia/MetaMask)
  useEffect(() => {
    const eth = (window as any).ethereum;
    const getSelected = async () => {
      if (!eth) return;
      const accts: string[] = await eth.request({ method: "eth_accounts" });
      if (accts && accts[0]) setAddr(accts[0]);
      eth.on?.("accountsChanged", (arr: string[]) => setAddr(arr?.[0] || ""));
    };
    getSelected();
  }, []);

  async function refresh() {
    if (!addr || !VAULT) return;
    if (loading) return;
    setLoading(true);
    try {
      const res = await getMissionStatus(addr);
      setStatus(res);
    } finally {
      setLoading(false);
    }
  }

  // auto refresh saat alamat sudah ada
  useEffect(() => {
    if (addr && VAULT) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addr, VAULT]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Missions</h1>
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

      {/* Info address */}
      <div className="mb-4 text-sm text-gray-500">
        {addr ? (
          <>
            Connected:{" "}
            <span className="font-medium">
              {addr.slice(0, 6)}…{addr.slice(-4)}
            </span>
          </>
        ) : (
          <>Connect wallet on Kairos to track progress.</>
        )}
      </div>

      {/* Mission cards */}
      <div className="space-y-4">
        {/* Mission 1 */}
        <div className="bg-white border rounded-2xl shadow-sm p-5 flex items-center justify-between">
          <div>
            <div className="font-semibold">
              Mission #1 — First Deposit ≥ 100 USDT
            </div>
            <div className="text-sm text-gray-500">
              Setor minimal 100 USDT sekali.
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              status?.m1
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {status?.m1 ? "Completed" : "Not yet"}
          </span>
        </div>

        {/* Mission 2 */}
        <div className="bg-white border rounded-2xl shadow-sm p-5 flex items-center justify-between">
          <div>
            <div className="font-semibold">
              Mission #2 — 3× deposits ≥ 10 USDT
            </div>
            <div className="text-sm text-gray-500">
              Lakukan 3 deposit (masing-masing ≥ 10 USDT).
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              status?.m2
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {status?.m2 ? "Completed" : "Not yet"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-gray-500 mt-8">
        Built for{" "}
        <span className="font-semibold">
          Kaia Wave Stablecoin Summer Hackathon
        </span>
      </p>
    </div>
  );
}
