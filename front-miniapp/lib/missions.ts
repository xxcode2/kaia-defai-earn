// lib/missions.ts
import vaultJson from "@/lib/abi/DefaiVault.json"; // tetap biar konsisten path alias (tidak dipakai langsung di sini, tapi aman)

/**
 * Bentuk status misi (pakai id m1..m10 sesuai UI).
 * Kalau kamu punya lebih dari 10 misi, tinggal tambah field baru (m11, dst).
 */
export type MissionStatus = {
  m1: boolean;
  m2: boolean;
  m3: boolean;
  m4: boolean;
  m5: boolean;
  m6: boolean;
  m7: boolean;
  m8: boolean;
  m9: boolean;
  m10: boolean;
};

/**
 * Key localStorage yang sama seperti yang dipakai di app/page.tsx:
 * `moreearn.missions:${address}`
 */
function MISS_KEY(addr: string) {
  const a = (addr || "guest").toLowerCase();
  return `moreearn.missions:${a}`;
}

/**
 * Helper aman membaca localStorage (SSR-safe).
 */
function safeReadMissions(addr: string): any[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MISS_KEY(addr));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Bentuk default semua misi = false (belum complete).
 */
function emptyStatus(): MissionStatus {
  return {
    m1: false,
    m2: false,
    m3: false,
    m4: false,
    m5: false,
    m6: false,
    m7: false,
    m8: false,
    m9: false,
    m10: false,
  };
}

/**
 * Konversi array missions (dari localStorage) -> MissionStatus
 * Asumsi struktur item: { id: "m1" | "m2" | ..., claimed: boolean, claimable: boolean, progress: number }
 * Kita tandai `true` jika sudah claimed ATAU (fallback) progress >= 100 & claimable.
 */
function toStatus(arr: any[] | null): MissionStatus {
  const base = emptyStatus();
  if (!arr) return base;

  for (const m of arr) {
    const id = String(m?.id || "");
    const done = Boolean(m?.claimed) || (Number(m?.progress) >= 100 && Boolean(m?.claimable));
    if (id in base) {
      (base as any)[id] = done;
    }
  }
  return base;
}

/**
 * API utama yang dipakai halaman /missions
 * - Return MissionStatus | null
 * - Null kalau dijalankan di server side (tidak ada window/localStorage)
 */
export async function getMissionStatus(address: string): Promise<MissionStatus | null> {
  if (typeof window === "undefined") return null;
  const data = safeReadMissions(address);
  return toStatus(data);
}
