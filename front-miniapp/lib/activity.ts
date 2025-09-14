// lib/activity.ts
import { BrowserProvider, Interface, Log, Result, formatUnits } from "ethers";
import vaultJson from "@/lib/abi/DefaiVault.json";

// ===== Interface & topics (ethers v6) =====
const iface = new Interface((vaultJson as any).abi);
export const topicDeposit: string = iface.getEventTopic("Deposit");
export const topicWithdraw: string = iface.getEventTopic("Withdraw");

export type UserActivity = {
  type: "Deposit" | "Withdraw";
  user: string;
  assets: number;
  shares: number;
  txHash: string;
  blockNumber: number;
};

const SHARE_DECIMALS = 18;

/** Parse 1 log menjadi UserActivity (null kalau bukan event yg kita mau) */
export function parseVaultLog(lg: Log, assetDecimals = 6): UserActivity | null {
  try {
    const parsed = iface.parseLog(lg) as { name: string; args: Result };
    if (!parsed) return null;
    const type = parsed.name as "Deposit" | "Withdraw";
    const user = parsed.args.user as string;
    const assets = Number(formatUnits(parsed.args.assets as bigint, assetDecimals));
    const shares = Number(formatUnits(parsed.args.shares as bigint, SHARE_DECIMALS));
    return {
      type,
      user,
      assets,
      shares,
      txHash: lg.transactionHash!,
      blockNumber: lg.blockNumber!
    };
  } catch {
    return null;
  }
}

/** Topics array untuk getLogs yang mengambil Deposit/Withdraw sekaligus */
export function combinedTopics(): (string | string[])[] {
  return [[topicDeposit, topicWithdraw]];
}

/**
 * Ambil activity user dari log on-chain vault.
 * Signature dibuat fleksibel agar cocok dengan pemanggilan di app/activity/page.tsx:
 *   getUserActivity(addr, VAULT)
 */
export async function getUserActivity(
  addr: string,
  vaultAddress: string,
  fromBlock = 0,
  assetDecimals = 6
): Promise<UserActivity[]> {
  // Buat provider dari window.ethereum (dipanggil dari komponen client)
  if (typeof window === "undefined" || !(window as any).ethereum) {
    return [];
  }
  const provider = new BrowserProvider((window as any).ethereum);

  const logs: Log[] = await (provider as any).getLogs({
    address: vaultAddress,
    fromBlock,
    toBlock: "latest",
    topics: combinedTopics()
  });

  // parse + filter by user (post-filter, lebih aman di testnet)
  const parsed = logs
    .map((lg) => parseVaultLog(lg, assetDecimals))
    .filter(Boolean) as UserActivity[];

  const filtered = addr
    ? parsed.filter((x) => x.user.toLowerCase() === addr.toLowerCase())
    : parsed;

  // urut terbaru dulu
  filtered.sort((a, b) => b.blockNumber - a.blockNumber);
  return filtered;
}
