import { Interface, Log, JsonRpcProvider } from "ethers";
import vaultJson from "../lib/abi/DefaiVault.json";

const KAIA_RPC = "https://public-en-kairos.node.kaia.io";
const iface = new Interface((vaultJson as any).abi);

const topicDeposit = iface.getEvent("Deposit").topicHash;
const topicMission = iface.getEvent("MissionCompleted").topicHash;

export type MissionStatus = { m1: boolean; m2: boolean };

export async function getMissionStatus(address: string, vaultAddr: string): Promise<MissionStatus> {
  const rpc = new JsonRpcProvider(KAIA_RPC);
  const fromBlock = Number(process.env.NEXT_PUBLIC_VAULT_FROM_BLOCK || 0);

  const logs: Log[] = await rpc.getLogs({
    address: vaultAddr.toLowerCase(),
    topics: [[topicDeposit, topicMission]],
    fromBlock,
    toBlock: "latest",
  });

  let m1 = false;
  let depositsGe10 = 0;

  for (const l of logs) {
    const ev = iface.parseLog(l)!;
    const who = (ev.args[0] as string).toLowerCase();
    if (who !== address.toLowerCase()) continue;

    if (ev.name === "MissionCompleted") {
      if ((ev.args[1] as string) === "DEPOSIT_100") m1 = true;
    } else if (ev.name === "Deposit") {
      const assets = Number(ev.args[1]) / 1e6;
      if (assets >= 10) depositsGe10++;
    }
  }

  const m2 = depositsGe10 >= 3;
  return { m1, m2 };
}
