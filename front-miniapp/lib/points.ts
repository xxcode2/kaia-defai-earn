// lib/points.ts
import { getUserActivity } from "@/lib/activity";

/**
 * Bentuk hasil yang diharapkan oleh app/profile/page.tsx:
 * - missions, deposits, referrals ada di root
 * - points = total keseluruhan
 */
export type PointsResult = {
  points: number;
  missions: number;
  deposits: number;
  referrals: number;
};

/**
 * Hitung poin user berbasis activity on-chain (deposit),
 * plus placeholder untuk missions & referrals (off-chain).
 *
 * @param addr        alamat user (lowercase/normal ok)
 * @param vault       alamat vault
 * @param fromBlock   mulai block scan (default 0)
 * @param assetDecs   desimal USDT (default 6)
 */
export async function calcPoints(
  addr: string,
  vault: string,
  fromBlock = 0,
  assetDecs = 6
): Promise<PointsResult> {
  // Ambil activity milik user tsb (sudah di-filter by address)
  const acts = await getUserActivity(addr, vault, fromBlock, assetDecs);

  // Akumulasi total USDT yang dideposit user tsb
  const depositUSDT = acts
    .filter((a) => a.type === "Deposit")
    .reduce((sum, a) => sum + (Number(a.assets) || 0), 0);

  // Skema poin sederhana: 1 poin per 1 USDT (bisa kamu ubah)
  const depositPts = Math.floor(depositUSDT);

  // Placeholder off-chain (kalau belum ada backend/LS yang konsisten saat SSR)
  const missions = 0;
  const referrals = 0;

  // Base points untuk semua user (sesuai UI kalian)
  const base = 120;

  const points = base + missions + depositPts + referrals;

  return { points, missions, deposits: depositPts, referrals };
}
