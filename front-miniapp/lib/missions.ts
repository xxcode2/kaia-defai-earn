// lib/missions.ts
import { id } from "ethers";

/**
 * TOPICS — aman untuk ethers v6 (tanpa Interface.getEvent).
 * Kalau kontrak kamu memang emit MissionCompleted(address,uint256),
 * topik di bawah sudah benar. Kalau tidak ada di kontrak, ini tetap
 * harmless karena kita tidak memanggil getLogs dari sini.
 */
export const topicDeposit  = id("Deposit(address,uint256,uint256)");
export const topicWithdraw = id("Withdraw(address,uint256,uint256)");
export const topicMission  = id("MissionCompleted(address,uint256)");

/* ========= Types ========= */
export type Mission = {
  id: string;
  title: string;
  pts: number;
  progress: number;  // 0..100
  claimable: boolean;
  claimed: boolean;
};

/* ========= Defaults ========= */
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

/* ========= Persist helpers ========= */
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
    // ignore
  }
}
