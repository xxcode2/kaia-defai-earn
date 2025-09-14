import { NextResponse } from "next/server";
import { Contract, Interface, JsonRpcProvider, formatUnits } from "ethers";
import vaultJson from "@/lib/abi/DefaiVault.json";
import usdtJson from "@/lib/abi/USDT.json";


 * ENV yang dipakai (set di Vercel › Settings › Environment Variables):
 * - NEXT_PUBLIC_RPC         : https://kairos.scope.kaia.io
 * - NEXT_PUBLIC_VAULT       : 0x328f7dEB7a47EE05D2013395096613F8929d7015
 * - NEXT_PUBLIC_USDT        : 0xB00ce96eE443CAa3d902f6B062C6A69310A88086
 * - NEXT_PUBLIC_VAULT_FROM_BLOCK : 196058363

const RPC         = process.env.NEXT_PUBLIC_RPC!;
const VAULT       = process.env.NEXT_PUBLIC_VAULT!;
const USDT        = process.env.NEXT_PUBLIC_USDT!;
const FROM_BLOCK  = Number(process.env.NEXT_PUBLIC_VAULT_FROM_BLOCK || "0");

// ethers v6
const provider = new JsonRpcProvider(RPC);
const vaultIface = new Interface((vaultJson as any).abi);

// Helper aman untuk dapatkan topic
function getTopic(name: string): string {
  const frag = vaultIface.getEvent(name);
  // @ts-expect-error: getEventTopic menerima fragment/string di v6
  return vaultIface.getEventTopic(frag ?? name);
}

const TOPIC_DEPOSIT  = getTopic("Deposit");
const TOPIC_WITHDRAW = getTopic("Withdraw");

export async function GET() {
  try {
    // TVL: coba baca totalAssets() → fallback ke saldo USDT vault
    let tvl: number | null = null;
    try {
      const vault = new Contract(VAULT, (vaultJson as any).abi, provider);
      const assets: bigint = await vault.totalAssets();
      // Ambil decimals USDT untuk format
      const usdt = new Contract(USDT, (usdtJson as any).abi, provider);
      const dec: number = Number(await usdt.decimals());
      tvl = Number(formatUnits(assets, dec));
    } catch {
      try {
        const usdt = new Contract(USDT, (usdtJson as any).abi, provider);
        const dec: number = Number(await usdt.decimals());
        const bal: bigint = await usdt.balanceOf(VAULT);
        tvl = Number(formatUnits(bal, dec));
      } catch {
        tvl = null;
      }
    }

    // Ambil semua log Deposit & Withdraw sejak FROM_BLOCK
    const [depLogs, wdLogs] = await Promise.all([
      provider.getLogs({ address: VAULT, fromBlock: FROM_BLOCK, toBlock: "latest", topics: [TOPIC_DEPOSIT] }),
      provider.getLogs({ address: VAULT, fromBlock: FROM_BLOCK, toBlock: "latest", topics: [TOPIC_WITHDRAW] }),
    ]);

    // Hitung metrik sederhana
    const usersSet = new Set<string>();
    let totalDeposits = 0;
    let totalWithdraws = 0;

    for (const l of depLogs) {
      try {
        const p = vaultIface.parseLog(l);
        const user = (p?.args?.user as string) || "";
        if (user) usersSet.add(user.toLowerCase());
        totalDeposits += 1;
      } catch {}
    }
    for (const l of wdLogs) {
      try {
        const p = vaultIface.parseLog(l);
        const user = (p?.args?.user as string) || "";
        if (user) usersSet.add(user.toLowerCase());
        totalWithdraws += 1;
      } catch {}
    }

    const payload = {
      tvl,
      users: usersSet.size,
      totalDeposits,
      totalWithdraws,
      updatedAt: new Date().toISOString(),
      fromBlock: FROM_BLOCK,
    };

    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
