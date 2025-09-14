// lib/points.ts
import { getUserActivity } from "./activity";

export type PointsResult = {
  total: number;
  breakdown: {
    missions: number;
    deposits: number;
  };
};

/**
 * Hitung points sederhana:
 * - missions: kamu bisa plug-in angka dari state/localStorage (atau zero)
 * - deposits: 1 USDT deposit = 1 point (contoh)
 */
export async function calcPoints(
  addr: string,
  vault: string,
  fromBlock = 0
): Promise<PointsResult> {
  // (sementara) missions off-chain = 0, silakan ganti jika ada state-nya
  const missions = 0;

  // Activity on-chain → jumlahkan Deposit milik addr
  const acts = await getUserActivity(addr, vault, fromBlock);
  const depositUSDT = acts
    .filter(
      (a) =>
        a.type === "Deposit" && a.user?.toLowerCase() === addr.toLowerCase()
    )
    .reduce((sum, a) => sum + (Number(a.assets) || 0), 0);

  const deposits = Math.floor(depositUSDT); // 1 USDT = 1 point (contoh)

  return {
    total: missions + deposits,
    breakdown: { missions, deposits },
  };
}
