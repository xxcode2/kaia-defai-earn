// lib/activity.ts
import { BrowserProvider, Contract, Interface, Log, formatUnits } from "ethers";
import vaultJson from "@/lib/abi/DefaiVault.json";

export type UserActivity = {
  type: "Deposit" | "Withdraw";
  user: string;
  assets: number;
  shares: number;
  txHash: string;
  blockNumber: number;
};

const iface = new Interface((vaultJson as any).abi);

export async function getVaultActivity(
  vault: string,
  fromBlock = 0,
  assetDecimals = 6
): Promise<UserActivity[]> {
  if (!(globalThis as any).ethereum) return [];

  const provider = new BrowserProvider((globalThis as any).ethereum);
  const depTopic = (iface.getEvent("Deposit") as any)?.topicHash as string;
  const wdTopic  = (iface.getEvent("Withdraw") as any)?.topicHash as string;
  if (!depTopic || !wdTopic) return [];

  const logs: Log[] = await (provider as any).getLogs({
    address: vault,
    fromBlock,
    toBlock: "latest",
    topics: [[depTopic, wdTopic]],
  });

  const list: UserActivity[] = logs
    .map((lg) => {
      try {
        const parsed: any = (iface as any).parseLog(lg);
        const type = parsed.name as "Deposit" | "Withdraw";
        const user: string = parsed.args.user;
        const assets = Number(formatUnits(parsed.args.assets, assetDecimals));
        const shares = Number(formatUnits(parsed.args.shares, 18));
        return { type, user, assets, shares, txHash: lg.transactionHash, blockNumber: lg.blockNumber };
      } catch {
        return null as any;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.blockNumber - a.blockNumber);

  return list;
}

export async function getUserActivity(
  addr: string,
  vault: string,
  fromBlock = 0,
  assetDecimals = 6
): Promise<UserActivity[]> {
  const all = await getVaultActivity(vault, fromBlock, assetDecimals);
  const lower = addr?.toLowerCase?.();
  return lower ? all.filter(a => a.user?.toLowerCase() === lower) : all;
}
