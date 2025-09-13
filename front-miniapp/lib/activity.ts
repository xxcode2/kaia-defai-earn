import { Interface, Log, JsonRpcProvider } from "ethers";
import vaultJson from "../lib/abi/DefaiVault.json";

const KAIA_RPC = "https://public-en-kairos.node.kaia.io";
const iface = new Interface((vaultJson as any).abi);

const topicDeposit = iface.getEvent("Deposit").topicHash;
const topicWithdraw = iface.getEvent("Withdraw").topicHash;

export type UserActivity = {
  type: "Deposit" | "Withdraw";
  amount: number;
  tx: string;
  blockNumber: number;
};

export async function getUserActivity(address: string, vaultAddr: string): Promise<UserActivity[]> {
  const rpc = new JsonRpcProvider(KAIA_RPC);
  const fromBlock = Number(process.env.NEXT_PUBLIC_VAULT_FROM_BLOCK || 0);

  const logs: Log[] = await rpc.getLogs({
    address: vaultAddr.toLowerCase(),
    topics: [[topicDeposit, topicWithdraw]],
    fromBlock,
    toBlock: "latest",
  });

  const acts: UserActivity[] = [];
  for (const l of logs) {
    const ev = iface.parseLog(l)!;
    const who = (ev.args[0] as string).toLowerCase();
    if (who !== address.toLowerCase()) continue;

    acts.push({
      type: ev.name as "Deposit" | "Withdraw",
      amount: Number(ev.args[1]) / 1e6,
      tx: l.transactionHash,
      blockNumber: Number(l.blockNumber),
    });
  }

  // newest first
  return acts.sort((a, b) => b.blockNumber - a.blockNumber);
}
