import type { NextApiRequest, NextApiResponse } from "next";

type Claim = { referrer: string; user: string; amount: number };
const store: { claims: Claim[] } = (globalThis as any);
if (!store.claims) store.claims = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "method-not-allowed" });

  const map = new Map<string, { referrer: string; totalTVL: number; invites: number }>();
  for (const c of store.claims) {
    const key = c.referrer;
    const prev = map.get(key) || { referrer: key, totalTVL: 0, invites: 0 };
    prev.totalTVL += c.amount;
    prev.invites += 1;
    map.set(key, prev);
  }

  const leaders = Array.from(map.values()).sort((a, b) => b.totalTVL - a.totalTVL).slice(0, 50);
  return res.status(200).json({ leaders });
}
