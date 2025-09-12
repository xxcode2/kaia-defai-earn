import type { NextApiRequest, NextApiResponse } from "next";
const KAIA_RPC = process.env.KAIA_RPC ?? "https://public-en-kairos.node.kaia.io";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const body = req.body || {};
    const r = await fetch(KAIA_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getLogs", params: [body] }),
    });
    if (!r.ok) return res.status(502).json({ error: await r.text() });
    const json = await r.json();
    if (json?.error && !json?.result) return res.status(500).json({ error: json.error });
    return res.status(200).json(json.result ?? []);
  } catch (e:any) {
    return res.status(500).json({ error: e?.message ?? "failed" });
  }
}
