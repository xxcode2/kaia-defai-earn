// lib/missions.ts
import { id } from "ethers";

/** ===== Event topics (ethers v6 friendly) ===== */
export const topicDeposit  = id("Deposit(address,uint256,uint256)");
export const topicWithdraw = id("Withdraw(address,uint256,uint256)");
export const topicMission  = id("MissionCompleted(address,uint256)");

/** ===== Types ===== */
export type Mission = {
  id: string;
  title: string;
  pts: number;
  progress: number;   // 0..100
  claimable: boolean;
  claimed: boolean;
};

export type MissionStatus = Record<string, boolean>; // true = selesai (claimed atau 100%)

export const DEFAULT_MISSIONS: Mission[] = [
  { id: "m1",  title: "Connect Wallet",                  pts: 50,  progress: 0, claimable: false, claimed: false },
  { id: "m2",  title: "First Deposit ≥ 50 USDT",         pts: 150, progress: 0, claimable: false, claimed: false },
  { id: "m3",  title: "Try Withdraw",                    pts: 100, progress: 0, claimable: false, claimed: false },
  { id: "m4",  title: "Reach 500 USDT (personal)",       pts: 120, progress: 0, claimable: false, claimed: false },
  { id: "m5",  title: "Reach 1,000 USDT (personal)",     pts: 200, progress: 0, claimable: false, claimed: false },
  { id: "m6",  title: "Make 3 Deposits",                 pts: 150, progress: 0, claimable: false, claimed: false },
  { id: "m7",  title: "Stay Staked for 7 days",          pts: 150, progress: 0, claimable: false, claimed: false },
  { id: "m8",  title: "Use Locked (Demo) once",          pts: 80,  progress: 0, claimable: false, claimed: false },
  { id: "m9",  title: "Top 100 Leaderboard (any time)",  pts: 250, progress: 0, claimable: false, claimed: false },
  { id: "m10", title: "Share Referral Link",             pts: 100, progress: 0, claimable: false, claimed: false },
];

/** ===== Persist helpers ===== */
const MISS_KEY = (addr: string) =>
  `moreearn.missions:${addr?.toLowerCase() || "guest"}`;

export function mergeMissions(saved: Mission[] | null): Mission[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_MISSIONS;
  const byId = new Map(saved.map((m) => [m.id, m]));
  return DEFAULT_MISSIONS.map((def) => {
    const old = byId.get(def.id);
    return old ? { ...def, ...old } : def;
  });
}

export function loadMissions(address: string): Mission[] {
  try {
    const raw = localStorage.getItem(MISS_KEY(address));
    const parsed = raw ? (JSON.parse(raw) as Mission[]) : null;
    return mergeMissions(parsed);
  } catch {
    return DEFAULT_MISSIONS;
  }
}

export function saveMissions(address: string, data: Mission[]) {
  try {
    localStorage.setItem(MISS_KEY(address), JSON.stringify(data));
  } catch {
    // ignore quota/SSG
  }
}

/** ===== API yang diminta file lain ===== */
// Status boolean per mission id (claimed OR progress >= 100 dianggap selesai)
export async function getMissionStatus(address: string): Promise<MissionStatus> {
  // dibuat async supaya kompatibel dengan import existing (kalau mereka await)
  const ms = loadMissions(address);
  const st: MissionStatus = {};
  for (const m of ms) st[m.id] = !!(m.claimed || m.progress >= 100);
  return st;
}

// Total poin yang sudah diklaim (berguna untuk points.ts)
export function getClaimedMissionPoints(address: string): number {
  const ms = loadMissions(address);
  return ms.filter((m) => m.claimed).reduce((s, m) => s + m.pts, 0);
}
