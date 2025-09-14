// lib/points.ts
import { getMissionStatus, type MissionStatus } from "./missions";
import { getUserActivity } from "./activity";

export type PointsResult = {
  total: number;
  missions: number;
  deposits: number;
  referrals: number;
};

/**
 * Hitung poin user:
 * - Base: 120 (off-chain)
 * - Missions: 50 poin per misi yang selesai (generic, supaya tidak hardcode)
 * - Deposits: 1 poin per 1 USDT yang dideposit (dibulatkan ke bawah)
 * - Referrals: 0 (placeholder – isi kalau sudah ada logic)
 */
export async function calcPoints(addr: string, vault: string): Promise<PointsResult> {
  // Missions (dibaca dari localStorage via getMissionStatus)
  const st: MissionStatus | null = await getMissionStatus(addr);
  const missionsCompleted = st ? Object.values(st).filter(Boolean).length : 0;
  const missionPts = missionsCompleted * 50;

  // Activity (on-chain) → jumlahkan Deposit milik addr tersebut
  const acts = await getUserActivity(addr, vault);
  const depositUSDT = acts
    .filter((a) => a.type === "Deposit" && a.user?.toLowerCase() === addr.toLowerCase())
    .reduce((sum, a) => sum + (Number(a.assets) || 0), 0);

  const depositPts = Math.floor(depositUSDT);

  const base = 120;
  const referrals = 0; // TODO: isi jika sudah ada sistem referral

  return {
    total: base + missionPts + depositPts + referrals,
    missions: missionPts,
    deposits: depositPts,
    referrals,
  };
}
