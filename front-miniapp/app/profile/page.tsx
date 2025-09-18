"use client";

import { useEffect, useState } from "react";
import { useAccount } from 'wagmi';
import { calcPoints, type PointsResult } from "@/lib/points";
import { shorten } from "@/lib/utils";
import { Copy, LogOut } from "lucide-react";
import { disconnectWallet } from "@/lib/wallet";


// === UI helpers ===
function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "emerald" }) {
  const colors =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colors}`}>
      {children}
    </span>
  );
}

function TierProgress({ points }: { points: number }) {
  const tiers = [0, 500, 2000, 5000];
  const max = tiers[tiers.length - 1];
  const pct = Math.min((points / max) * 100, 100);

  return (
    <div className="w-full mt-4">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-2 bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function tierLabel(points: number) {
  if (points >= 5000) return "Diamond";
  if (points >= 2000) return "Gold";
  if (points >= 500) return "Silver";
  return "Bronze";
}

// === Main page ===
export default function ProfilePage() {
 const { address: addr, isConnected } = useAccount();
  const [pts, setPts] = useState<PointsResult | null>(null);

  useEffect(() => {
    async function run() {
      if (!addr) return;
      const res = await calcPoints(addr, process.env.NEXT_PUBLIC_VAULT!);
      setPts(res);
    }
    run();
  }, [addr]);

  return (
    <div className="space-y-6">
      {/* Address card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Connected Wallet</div>
            <div className="font-mono text-sm mt-1">{addr ? shorten(addr) : "—"}</div>
          </div>
          <div className="flex gap-2">
            {addr && (
              <button
                onClick={() => navigator.clipboard.writeText(addr)}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                <Copy size={16} />
              </button>
            )}
            <button
              onClick={disconnectWallet}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Points card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-medium">Your Points</div>
        <div className="text-3xl font-semibold mt-1">
          {pts ? pts.total.toLocaleString() : "—"}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Missions: <b>{pts?.missions ?? 0}</b> · Deposits:{" "}
          <b>{pts?.deposits ?? 0}</b> · Referrals:{" "}
          <b>{pts?.referrals ?? 0}</b>
        </div>

        <div className="mt-3">
          <Pill tone="emerald">{tierLabel(pts?.total ?? 0)} Tier</Pill>
          <TierProgress points={pts?.total ?? 0} />
        </div>
      </div>

      {/* Badges (demo static) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-medium mb-2">Badges</div>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium">
            Early Adopter
          </span>
          <span className="px-3 py-1 rounded-lg bg-yellow-100 text-yellow-700 text-xs font-medium">
            Depositor
          </span>
        </div>
      </div>

      {/* Referral (placeholder) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-medium">Referral</div>
        <div className="mt-2 text-xs text-gray-500">
          Bagikan referral link untuk mendapatkan poin tambahan.
        </div>
      </div>

      <p className="text-center text-gray-500 mt-8">
        Points bersifat off-chain untuk gamifikasi.
      </p>
    </div>
  );
}
