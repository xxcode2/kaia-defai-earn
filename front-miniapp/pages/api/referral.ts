import type { NextApiRequest, NextApiResponse } from "next";

type Claim = { referrer: string; user: string; amount: number };

const store: { claims: Claim[] } = (globalThis as any);
if (!store.claims) store.claims = [];

/** POST /api/referral  { referrer, user, amount } */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method-not-allowed" });

  try {
    const { referrer, user, amount } = req.body || {};
    if (!/^0x[a-fA-F0-9]{40}$/.test(referrer || "") || !/^0x[a-fA-F0-9]{40}$/.test(user || ""))
      return res.status(400).json({ error: "invalid-address" });

    const u = String(user).toLowerCase();
    if (store.claims.find((c) => c.user === u)) {
      return res.status(200).json({ ok: true, note: "already-claimed" });
    }

    store.claims.push({
      referrer: String(referrer).toLowerCase(),
      user: u,
      amount: Math.max(0, Number(amount) || 0),
    });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "server-error" });
  }
}
