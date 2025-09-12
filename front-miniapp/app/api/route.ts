// app/api/logs/route.ts
import { NextRequest, NextResponse } from "next/server";

const KAIA_RPC = process.env.KAIA_RPC ?? "https://public-en-kairos.node.kaia.io";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // body: { address, fromBlock, toBlock, topics }
    const payload = {
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1e9),
      method: "eth_getLogs",
      params: [body],
    };

    const r = await fetch(KAIA_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      // no wallet extension interception on server
    });

    if (!r.ok) {
      const txt = await r.text();
      return NextResponse.json({ error: txt }, { status: 502 });
    }
    const json = await r.json();

    // Dibeberapa node ada format {result} atau {error}
    if (!json || (json.error && !json.result)) {
      return NextResponse.json({ error: json?.error ?? "unknown" }, { status: 500 });
    }

    return NextResponse.json(json.result ?? []);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
