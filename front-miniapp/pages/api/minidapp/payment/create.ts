import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).end();

    const { amount, currency, itemId } = req.body ?? {};
    if (!amount || !currency) return res.status(400).json({ error: "Invalid input" });

    // TODO: ganti dengan API Dapp Portal Payment beneran
    const session = {
      id: "demo-session",
      checkoutUrl: "https://example.com/checkout?sid=demo-session",
    };

    res.status(200).json(session);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
}
