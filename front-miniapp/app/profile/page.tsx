"use client";

import { useEffect, useMemo, useState } from "react";
import { calcPoints, PointsResult } from "@/lib/points";
import { getRefFromURL, saveRefLocal, getSavedRef } from "@/lib/referral";

export default function ProfilePage() {
  const [addr, setAddr] = useState("");
  const [pts, setPts] = useState<PointsResult | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // IMPORTANT: gunakan state untuk refLink agar tidak memicu hydration mismatch
  const [refLink, setRefLink] = useState<string>("?ref=0xYourAddr"); // placeholder yang sama di server & client awal
  const VAULT = useMemo(() => process.env.NEXT_PUBLIC_VAULT || "", []);

  // simpan ?ref= saat user membuka halaman profile (sekali saja)
  useEffect(() => {
    const r = getRefFromURL();
    if (r) saveRefLocal(r);
    setRef(getSavedRef());
  }, []);

  // ambil akun wallet aktif
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    eth.request({ method: "eth_accounts" }).then((a: string[]) => a?.[0] && setAddr(a[0]));
    eth.on?.("accountsChanged", (arr: string[]) => setAddr(arr?.[0] || ""));
  }, []);

  // bangun refLink hanya di client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const base = window.location.origin;
      const who = addr || "0xYourAddr";
      setRefLink(`${base}?ref=${who}`);
    }
  }, [addr]);

  async function refresh() {
    if (!addr || !VAULT || loading) return;
    setLoading(true);
    try {
      const r = await calcPoints(addr, VAULT);
      setPts(r);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (addr && VAULT) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addr, VAULT]);

  function copyRef() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(refLink);
      alert("Referral link copied!");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <button
          onClick={refresh}
          disabled={loading || !addr}
          className={`px-4 py-2 rounded-md text-white ${loading || !addr ? "bg-gray-300" : "bg-teal-500 hover:bg-teal-600"}`}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border">
          <div className="text-sm">
            Address:{" "}
            <span className="font-mono text-xs">
              {addr ? `${addr.slice(0, 10)}…${addr.slice(-6)}` : "—"}
            </span>
          </div>
          <div className="text-sm mt-1">
            Vault: <span className="font-mono text-xs">{VAULT || "-"}</span>
          </div>
          <div className="text-sm mt-1">
            Saved referrer: <span className="font-mono text-xs">{ref || "—"}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border">
          <div className="text-sm font-medium mb-2">Referral</div>
          {/* refLink sudah aman: di server selalu placeholder yang sama, di client akan diupdate */}
          <div className="text-xs text-gray-600 break-all">{refLink}</div>
          <button onClick={copyRef} className="mt-3 px-3 py-2 rounded-md bg-slate-800 text-white text-sm">
            Copy link
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border mt-4">
        <div className="text-sm font-medium">Your Points</div>
        <div className="text-3xl font-semibold mt-1">
          {pts ? pts.points.toLocaleString() : "—"}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Missions: <b>{pts?.breakdown.missions ?? 0}</b> · Deposits:{" "}
          <b>{pts?.breakdown.deposits ?? 0}</b>
        </div>
      </div>

      <p className="text-center text-gray-500 mt-8">Points bersifat off-chain untuk gamifikasi.</p>
    </div>
  );
}
