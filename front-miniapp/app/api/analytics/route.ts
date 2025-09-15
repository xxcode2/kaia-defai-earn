// app/api/analytics/route.ts
import { NextResponse } from "next/server";
import { Interface, Contract, JsonRpcProvider, formatUnits, Log } from "ethers";
import usdtJson from "@/lib/abi/USDT.json";
import vaultJson from "@/lib/abi/DefaiVault.json";

/**
 * ENV yang dipakai (set di .env.local / Vercel Project Settings):
 * - NEXT_PUBLIC_RPC_HTTP        : RPC HTTP (contoh Kairos) → https://public-en-kairos.node.kaia.io
 * - NEXT_PUBLIC_VAULT           : alamat kontrak vault
 * - NEXT_PUBLIC_USDT            : alamat token USDT
 * - NEXT_PUBLIC_VAULT_FROM_BLOCK: block awal scan event (string angka), default "0"
 */

const RPC =
  process.env.NEXT_PUBLIC_RPC_HTTP ||
  process.env.NEXT_PUBLIC_RPC || // fallback kalau kamu sempat pakai nama ini
  "";

const VAULT = process.env.NEXT_PUBLIC_VAULT!;
const USDT = process.env.NEXT_PUBLIC_USDT!;
const FROM_BLOCK = Number(process.env.NEXT_PUBLIC_VAULT_FROM_BLOCK || "0");

// Provider read-only — TIDAK memicu konek wallet
const provider = new JsonRpcProvider(RPC);

// Siapkan Interface untuk baca topic event
const iface = new Interface(vaultJson.abi as any);

// Coba dapatkan topic via fragment (compat ethers v6)
const depFrag = iface.getEvent?.("Deposit") as any;
const wdFrag = iface.getEvent?.("Withdraw") as any;

// Topic hash aman (support beberapa cara)
const topicDeposit: string =
  (depFrag?.topicHash as string) ||
  (iface as any).getEventTopic?.("Deposit(address,uint256,uint256)");
const topicWithdraw: string =
  (wdFrag?.topicHash as string) ||
  (iface as any).getEventTopic?.("Withdraw(address,uint256,uint256)");

if (!topicDeposit || !topicWithdraw) {
  // Biarkan handler mengembalikan error yang jelas kalau ABI tidak cocok
  console.warn("ABI tidak memiliki event Deposit/Withdraw yang sesuai.");
}

export async function GET() {
  try {
    if (!RPC || !VAULT || !USDT) {
      return NextResponse.json(
        { error: "Missing RPC/VAULT/USDT env. Set NEXT_PUBLIC_RPC_HTTP, NEXT_PUBLIC_VAULT, NEXT_PUBLIC_USDT." },
        { status: 500 },
      );
    }

    // 1) TVL: pakai balanceOf(USDT, VAULT)
    const usdtRead: any = new Contract(USDT, usdtJson.abi as any, provider);
    const decimalsRaw: bigint = (await safeCall(usdtRead, "decimals")) ?? 6n;
    const aDec = Number(decimalsRaw);
    const tvlRaw: bigint = (await safeCall(usdtRead, "balanceOf", VAULT)) ?? 0n;
    const tvl = Number(formatUnits(tvlRaw, aDec));

    // 2) Ambil logs Deposit/Withdraw
    let totalDeposits = 0;
    let totalWithdraws = 0;
    const users = new Set<string>();

    if (topicDeposit && topicWithdraw) {
      const logs: Log[] = await provider.getLogs({
        address: VAULT,
        fromBlock: FROM_BLOCK || 0,
        toBlock: "latest",
        topics: [[topicDeposit, topicWithdraw]],
      });

      // Perlu interface parseLog untuk ambil nama & args
      const vaultIface = new Interface(vaultJson.abi as any);

      for (const lg of logs) {
        try {
          const parsed = vaultIface.parseLog(lg as any);
          if (!parsed) continue;

          const name = parsed.name as "Deposit" | "Withdraw";
          const user = String(parsed.args?.user || "").toLowerCase();
          const assets = Number(formatUnits(parsed.args?.assets ?? 0n, aDec));

          if (user) users.add(user);
          if (name === "Deposit") totalDeposits += assets;
          if (name === "Withdraw") totalWithdraws += assets;
        } catch {
          // skip log yang tidak dikenali
        }
      }
    }

    const payload = {
      tvl: Number.isFinite(tvl) ? tvl : null,
      users: users.size,
      totalDeposits,
      totalWithdraws,
      updatedAt: new Date().toISOString(),
      fromBlock: FROM_BLOCK || 0,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err: any) {
    console.error("Analytics API error:", err);
    return NextResponse.json(
      { error: err?.message || "failed" },
      { status: 500 },
    );
  }
}

/** Helper pemanggilan aman — jika method tak ada / revert, kembalikan null */
async function safeCall(c: any, fn: string, ...args: any[]) {
  if (!c || typeof c[fn] !== "function") return null;
  try {
    return await c[fn](...args);
  } catch {
    return null;
  }
}
