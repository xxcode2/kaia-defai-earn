const REF_KEY = "defai_ref";

/** Ambil ref dari URL (?ref=0x...) */
export function getRefFromURL(): string | null {
  if (typeof window === "undefined") return null;
  const u = new URL(window.location.href);
  const r = u.searchParams.get("ref");
  if (r && /^0x[a-fA-F0-9]{40}$/.test(r)) return r.toLowerCase();
  return null;
}

/** Simpan ref ke localStorage */
export function saveRefLocal(addr: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REF_KEY, addr.toLowerCase());
  } catch {}
}

/** Ambil ref tersimpan */
export function getSavedRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(REF_KEY);
    return v && /^0x[a-fA-F0-9]{40}$/.test(v) ? v.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Panggil ini SETELAH first deposit sukses */
export async function submitFirstDeposit(user: string, amountUSDT: number) {
  const ref = getSavedRef();
  if (!ref) return { ok: false, reason: "no-ref" };

  try {
    const res = await fetch("/api/referrals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user, referrer: ref, amount: amountUSDT }),
    });
    return await res.json();
  } catch (e) {
    console.warn("submitFirstDeposit error", e);
    return { ok: false, reason: "network" };
  }
}
