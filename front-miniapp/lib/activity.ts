// lib/activity.ts
import { Interface, Log, Result, formatUnits } from "ethers";
import vaultJson from "@/lib/abi/DefaiVault.json";

const iface = new Interface((vaultJson as any).abi);

// SAFE: langsung ambil topic via getEventTopic (tidak nullable)
export const topicDeposit: string = iface.getEventTopic("Deposit");
export const topicWithdraw: string = iface.getEventTopic("Withdraw");

export type UserActivity = {
  type: "Deposit" | "Withdraw";
  user: string;
  assets: number;   // in USDT (readable)
  shares: number;   // in shares (readable)
  txHash: string;
  blockNumber: number;
};

const SHARE_DECIMALS = 18;

/**
 * Parse a single vault log safely.
 */
export function parseVaultLog(
  lg: Log,
  assetDecimals = 6
): UserActivity | null {
  try {
    const parsed = iface.parseLog(lg) as { name: string; args: Result };
    if (!parsed) return null;

    const type = parsed.name as "Deposit" | "Withdraw";
    const user: string = parsed.args.user as string;
    const assets = Number(formatUnits(parsed.args.assets as bigint, assetDecimals));
    const shares = Number(formatUnits(parsed.args.shares as bigint, SHARE_DECIMALS));

    return {
      type,
      user,
      assets,
      shares,
      txHash: lg.transactionHash!,
      blockNumber: lg.blockNumber!,
    };
  } catch {
    return null;
  }
}

/**
 * Utility untuk memfilter logs (gabungan deposit/withdraw topic).
 * Pakai ini saat memanggil provider.getLogs({ topics: [[topicDeposit, topicWithdraw]], ... })
 */
export function combinedTopics(): (string | string[])[] {
  return [[topicDeposit, topicWithdraw]];
}
