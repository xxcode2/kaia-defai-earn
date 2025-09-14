// lib/activity.ts
"use client";

import {
  BrowserProvider,
  JsonRpcProvider,
  type Log,
  Interface,
  formatUnits,
  id,
} from "ethers";
import vaultJson from "@/lib/abi/DefaiVault.json";

export type UserActivity = {
  blockNumber: number;
  type: "Deposit" | "Withdraw";
  user: string;
  assets: number;   // USDT (readable)
  shares: number;   // shares (readable)
  txHash: string;
};

// ===== Interface & topics (ethers v6) =====
const iface = new Interface((vaultJson as any).abi);
// Event topic = keccak256("EventName(types)")
export const topicDeposit: string = id("Deposit(address,uint256,uint256)");
export const topicWithdraw: string = id("Withdraw(address,uint256,uint256)");

/**
 * Ambil provider:
 * - Browser: BrowserProvider(window.ethereum)
 * - Server / fallback: JsonRpcProvider(NEXT_PUBLIC_RPC)
 */
function getProvider() {
  const rpc = process.env.NEXT_PUBLIC_RPC || "";
  if (typeof window !== "undefined" && (window as any).ethereum) {
    return new BrowserProvider((window as any).ethereum);
  }
  if (!rpc) {
    throw new Error(
      "No provider available. Set NEXT_PUBLIC_RPC or open in a browser with wallet."
    );
  }
  return new JsonRpcProvider(rpc);
}

/**
 * Ambil aktivitas Deposit/Withdraw dari vault
 * @param vaultAddr alamat vault
 * @param fromBlock block awal (default 0)
 * @param assetDecimals desimal aset (USDT biasanya 6)
 * @returns UserActivity[]
 */
export async function getUserActivity(
  vaultAddr: string,
  fromBlock = 0,
  assetDecimals = 6
): Promise<UserActivity[]> {
  const provider: any = getProvider();

  const logs: Log[] = await provider.getLogs({
    address: vaultAddr,
    fromBlock: fromBlock || 0,
    toBlock: "latest",
    topics: [[topicDeposit, topicWithdraw]],
  });

  const rows: UserActivity[] = logs
    .map((lg) => {
      try {
        const parsed = iface.parseLog(lg);
        if (!parsed) return null as any;

        const name = parsed.name as "Deposit" | "Withdraw";
        const user: string = parsed.args.user;
        const assets = Number(formatUnits(parsed.args.assets, assetDecimals));
        const shares = Number(formatUnits(parsed.args.shares, 18));

        return {
          blockNumber: lg.blockNumber,
          type: name,
          user,
          assets,
          shares,
          txHash: lg.transactionHash,
        };
      } catch {
        return null as any;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.blockNumber - a.blockNumber);

  return rows;
}
