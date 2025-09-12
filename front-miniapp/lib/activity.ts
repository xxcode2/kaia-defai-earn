// front-miniapp/lib/activity.ts
import { Interface, formatUnits } from "ethers";
import vaultJson from "./abi/DefaiVault.json";

/** ========= util ========= */
const KAIA_RPC_FALLBACK =
  process.env.NEXT_PUBLIC_KAIA_RPC || "https://public-en-kairos.node.kaia.io";

// encode alamat (indexed topic)
function addrTopic(addr: string) {
  const a = addr.toLowerCase().replace(/^0x/, "");
  return "0x" + "0".repeat(64 - a.length) + a;
}

// panggil API route / fallback langsung ke RPC publik
async function rpcGetLogs(body: {
  address: string;
  fromBlock?: string;
  toBlock?: string;
  topics?: (string | null)[];
}) {
  try {
    const res = await fetch("/api/logs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status !== 404 && !res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`/api/logs ${res.status} ${JSON.stringify(err)}`);
    }
    if (res.ok) return (await res.json()) as any[];
  } catch {
    // continue to fallback
  }

  // fallback direct to RPC
  const r = await fetch(KAIA_RPC_FALLBACK, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getLogs",
      params: [body],
    }),
  });
  if (!r.ok) throw new Error(`rpc fallback ${r.status} ${await r.text()}`);
  const j = await r.json();
  if (j?.error) throw new Error(JSON.stringify(j.error));
  return (j.result ?? []) as any[];
}

/** ========= main ========= */
const iface = new Interface((vaultJson as any).abi);
const topicDeposit = iface.getEvent("Deposit").topicHash;   // Deposit(address indexed user, uint256 assets, uint256 shares)
const topicWithdraw = iface.getEvent("Withdraw").topicHash; // Withdraw(address indexed user, uint256 assets, uint256 shares)

const BASE_FROM = Number(process.env.NEXT_PUBLIC_VAULT_FROM_BLOCK || "0");

// incremental cache di localStorage, per-user
function getUserFromBlock(addr: string) {
  const k = `act_from_${addr.toLowerCase()}`;
  const v = typeof window !== "undefined" ? localStorage.getItem(k) : null;
  return v ? Math.max(Number(v), BASE_FROM) : BASE_FROM;
}
function setUserFromBlock(addr: string, blk: number) {
  const k = `act_from_${addr.toLowerCase()}`;
  try {
    localStorage.setItem(k, String(blk));
  } catch {}
}

export type ActivityRow = {
  type: "Deposit" | "Withdraw";
  amount: number; // USDT
  tx: string;
  block: number;
};

/**
 * Ambil riwayat Activity untuk user (cepat):
 * - Filter langsung pakai topic alamat user (indexed)
 * - Gunakan incremental fromBlock (disimpan di localStorage)
 * - Fallback ke RPC publik jika API route tidak ada
 */
export async function getUserActivity(addr: string, vaultAddr: string) {
  const fromBlock = getUserFromBlock(addr);
  const userT = addrTopic(addr);

  // Deposit milik user
  const depLogs = await rpcGetLogs({
    address: vaultAddr.toLowerCase(),
    topics: [topicDeposit, userT],
    fromBlock: "0x" + fromBlock.toString(16),
    toBlock: "latest",
  });

  // Withdraw milik user
  const wLogs = await rpcGetLogs({
    address: vaultAddr.toLowerCase(),
    topics: [topicWithdraw, userT],
    fromBlock: "0x" + fromBlock.toString(16),
    toBlock: "latest",
  });

  const logs = [...depLogs, ...wLogs];
  if (logs.length === 0) return [];

  // update incremental pointer
  const maxBlk = logs.reduce(
    (m: number, l: any) => Math.max(m, Number(l.blockNumber)),
    fromBlock
  );
  setUserFromBlock(addr, maxBlk + 1);

  const items: ActivityRow[] = logs.map((l: any) => {
    const ev = iface.parseLog(l)!;
    return {
      type: ev.name as ActivityRow["type"],
      amount: Number(formatUnits(ev.args[1], 6)), // USDT 6 desimal
      tx: l.transactionHash as string,
      block: Number(l.blockNumber),
    };
  });

  // terbaru dulu
  items.sort((a, b) => b.block - a.block);
  return items;
}
