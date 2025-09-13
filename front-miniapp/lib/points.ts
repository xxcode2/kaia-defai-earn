import { getMissionStatus } from "./missions";
import { getUserActivity } from "./activity";

export type PointsResult = {
  points: number;
  breakdown: { missions: number; deposits: number };
};

/** Skor:
 *  +100 per mission completed (m1/m2)
 *  +1 point per USDT deposit kumulatif
 */
export async function calcPoints(addr: string, vault: string): Promise<PointsResult> {
  const ms = await getMissionStatus(addr, vault);
  const missionPts = (ms.m1 ? 100 : 0) + (ms.m2 ? 100 : 0);

  const acts = await getUserActivity(addr, vault);
  const depositSum = acts
    .filter((a) => a.type === "Deposit")
    .reduce((s, a) => s + (a.amount || 0), 0);

  const depositPts = Math.floor(depositSum);
  return {
    points: missionPts + depositPts,
    breakdown: { missions: missionPts, deposits: depositPts },
  };
}
