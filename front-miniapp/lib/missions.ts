// front-miniapp/lib/missions.ts
import { Interface, JsonRpcProvider, Log } from "ethers";
import vaultJson from "./abi/DefaiVault.json";

const KAIA_RPC = "https://public-en-kairos.node.kaia.io";
const iface = new Interface((vaultJson as any).abi);

const topicDeposit = iface.getEvent("Deposit").topicHash;
const topicMission = iface.getEvent("MissionCompleted").topicHash;

export async function getMissionStatus(address: string, vaultAddr: string) {
  const rpc = new JsonRpcProvider(KAIA_RPC);
  const logs: Log[] = await rpc.getLogs({
    address: vaultAddr.toLowerCase(),
    topics: [[topicDeposit, topicMission]],
    fromBlock: 0,
    toBlock: "latest",
  });

  let m1 = false;
  let depositsGe10 = 0;

  for (const l of logs) {
    const ev = iface.parseLog(l)!;

    if (
      ev.name === "MissionCompleted" &&
      (ev.args[0] as string).toLowerCase() === address.toLowerCase()
    ) {
      if ((ev.args[1] as string) === "DEPOSIT_100") m1 = true;
    }

    if (
      ev.name === "Deposit" &&
      (ev.args[0] as string).toLowerCase() === address.toLowerCase()
    ) {
      const assets = Number(ev.args[1]) / 1e6; // USDT punya 6 desimal
      if (assets >= 10) depositsGe10++;
    }
  }

  const m2 = depositsGe10 >= 3;
  return { m1, m2 };
}
