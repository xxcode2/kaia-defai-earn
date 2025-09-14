// app/api/analytics/route.ts
import { NextResponse } from "next/server";
import { JsonRpcProvider, Contract, Log, formatUnits } from "ethers";
import vaultJson from "@/lib/abi/DefaiVault.json";

const VAULT = process.env.NEXT_PUBLIC_VAULT as string;
const FROM_BLOCK = Number(process.env.NEXT_PUBLIC_VAULT_FROM_BLOCK || "0");
const RPC_URL =
  process.env.RPC_URL ||
  process.env.NEXT_PUBLIC_RPC ||
  "https://public-en-kairos.node.kaia.io";

// (optional) kalau USDT decimals-nya beda, ganti di .env dan baca dari token
const ASSET_DECIMALS = Number(process.env.NEXT_PUBLIC_USDT_DECIMALS || "6");

export async function GET() {
  try {
    if (!VAULT) {
      return NextResponse.json({ error: "ENV NEXT_PUBLIC_VAULT belum di-set" }, { status: 500 });
    }

    const provider = new JsonRpcProvider(RPC_URL);

    // Ambil topic event dari ABI
    const iface = new Contract(VAULT, vaultJson.abi).interface;

    const depEvt = iface.getEvent("Deposit(address indexed user,uint256 assets,uint256 shares)");
    const wdEvt  = iface.getEvent("Withdraw(address indexed user,uint256 assets,uint256 shares)");

    const depositTopic = depEvt?.topicHash;
    const withdrawTopic = wdEvt?.topicHash;

    if (!depositTopic || !withdrawTopic) {
      return NextResponse.json(
        { error: "Event topics tidak ditemukan dari ABI (cek ABI/kontrak)" },
        { status: 500 }
      );
    }

    // Ambil semua log Deposit/Withdraw
    const logs: Log[] = await (provider as any).getLogs({
      address: VAULT,
      fromBlock: FROM_BLOCK,
      toBlock: "latest",
      topics: [[depositTopic, withdrawTopic]], // <- sekarang dijamin string, bukan undefined
    });

    // Agregasi sederhana: estimasi TVL berbasis net deposit-withdraw (asset units)
    let tvl = 0;
    for (const lg of logs) {
      try {
        const p = iface.parseLog(lg);
        if (!p) continue;
        const assets = Number(formatUnits(p.args.assets, ASSET_DECIMALS));
        if (p.name === "Deposit") tvl += assets;
        if (p.name === "Withdraw") tvl -= assets;
      } catch {
        // skip log yang tidak bisa diparse
      }
    }

    return NextResponse.json({
      tvl,
      logsCount: logs.length,
      fromBlock: FROM_BLOCK,
      vault: VAULT,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
