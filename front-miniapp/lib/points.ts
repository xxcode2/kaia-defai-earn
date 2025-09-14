// lib/points.ts
import { getUserActivity } from "@/lib/activity";

export type PointsResult = {
  /** total poin (alias: points) */
  total: number;
  points: number;

  /** breakdown */
  missions: number;
  deposits: number;
  referrals: number;
};

/**
 * Hitung poin user:
 * - deposits: 1 poin per 1 USDT deposit (on-chain)
 * - missions/referrals: placeholder 0 (bisa diganti saat ada backend/LS)
 * - base: 120 poin (sesuai UI)
 */
export async function calcPoints(
  addr: string,
  vault: string,
  fromBlock = 0,
  assetDecs = 6
): Promise<PointsResult> {
  // Ambil activity milik address tsb
  const acts = await getUserActivity(addr, vault, fromBlock, assetDecs);

  // Akumulasi deposit USDT (on-chain)
  const depositUSDT = acts
    .filter((a) => a.type === "Deposit")
    .reduce((sum, a) => sum + (Number(a.assets) || 0), 0);

  const deposits = Math.floor(depositUSDT);

  // Placeholder (off-chain)
  const missions = 0;
  const referrals = 0;

  // Base points untuk semua user
  const base = 120;

  const points = base + missions + deposits + referrals;

  // Kembalikan dengan alias "total" agar cocok dengan page.tsx/profile.tsx
  return {
    total: points,
    points,
    missions,
    deposits,
    referrals,
  };
}
