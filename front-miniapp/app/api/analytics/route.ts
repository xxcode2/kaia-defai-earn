// front-miniapp/app/api/analytics/route.ts
import { NextResponse } from "next/server";
import { JsonRpcProvider, Interface, Log } from "ethers";
import vaultJson from "@/lib/abi/DefaiVault.json";

const RPC = process.env.NEXT_PUBLIC_RPC || "https://public-en-kairos.node.kaia.io";
const VAULT = process.env.NEXT_PUBLIC_VAULT!;
const FROM_BLOCK = Number(process.env.NEXT_PUBLIC_VAULT_FROM_BLOCK || "0");

// in-memory cache (per server instance)
let last: { t: number; data: any } | null = null;
const CACHE_MS = 60_000 * 5; // 5 minutes

export async function GET() {
  try {
    if (last && Date.now() - last.t < CACHE_MS) {
      return NextResponse.json(last.data, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } });
    }

    const provider = new JsonRpcProvider(RPC);
    const iface = new Interface((vaultJson as any).abi);

    // Topics
    const depositTopic = iface.getEvent("Deposit")?.topicHash;
    const withdrawTopic = iface.getEvent("Withdraw")?.topicHash;

    // Pull logs for Deposit & Withdraw
    const logs: Log[] = await provider.getLogs({
      address: VAULT.toLowerCase(),
      fromBlock: FROM_BLOCK,
      toBlock: "latest",
      topics: [[depositTopic, withdrawTopic]],
    });

    // Aggregate
    const users = new Set<string>();
    let totalDeposits = 0n;
    let totalWithdraws = 0n;

    for (const lg of logs) {
      let ev;
      try {
        ev = iface.parseLog(lg);
      } catch {
        continue;
      }
      const name = ev?.name;
      if (!name) continue;

      if (name === "Deposit") {
        const user = (ev.args[0] as string).toLowerCase();
        const assets = BigInt(ev.args[1].toString());
        users.add(user);
        totalDeposits += assets;
      } else if (name === "Withdraw") {
        const user = (ev.args[0] as string).toLowerCase();
        const assets = BigInt(ev.args[1].toString());
        users.add(user);
        totalWithdraws += assets;
      }
    }

    // Try to get TVL via totalAssets(); if not available, approximate
    let tvl: number | null = null;
    try {
      const vault = new (await import("ethers")).Contract(VAULT, (vaultJson as any).abi, provider);
      if (vault.interface.getFunction("totalAssets()")) {
        const raw = await vault.totalAssets();
        tvl = Number((await import("ethers")).formatUnits(raw, 6));
      }
    } catch {}

    const data = {
      tvl,                                    // may be null if function not in ABI
      users: users.size,
      totalDeposits: Number((await import("ethers")).formatUnits(totalDeposits, 6)),
      totalWithdraws: Number((await import("ethers")).formatUnits(totalWithdraws, 6)),
      updatedAt: new Date().toISOString(),
      fromBlock: FROM_BLOCK,
    };

    last = { t: Date.now(), data };
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "analytics-failed" }, { status: 500 });
  }
}
