import { JsonRpcProvider, Log } from "ethers";
import { TRANSFER_TOPIC, topicAddr, hexToBigInt } from "./erc20";

const USDT = (process.env.NEXT_PUBLIC_USDT || "0xB00ce96eE443CAa3d902f6B062C6A69310A88086").toLowerCase();
const VAULT = (process.env.NEXT_PUBLIC_VAULT || "0x328f7dEB7a47EE05D2013395096613F8929d7015").toLowerCase();
const FROM_BLOCK = Number(process.env.NEXT_PUBLIC_VAULT_FROM_BLOCK || "196058363");
const RPC = process.env.NEXT_PUBLIC_RPC || "https://public-en-kairos.node.kaia.io";
export const USDT_DECIMALS = 6;

const CHUNK = 5_000; // block range per fetch (aman utk RPC publik)

type Day = string; // "YYYY-MM-DD"

export type DailyRow = { date: Day; inflow: number; outflow: number; net: number };
export type Summary = {
  tvl: number;
  volume7d: number;
  uniqueDepositors7d: number;
  days: DailyRow[];
};

function toDay(ts: number): Day {
  const d = new Date(ts * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function fetchAnalytics(): Promise<Summary> {
  if (!USDT || !VAULT || !FROM_BLOCK) throw new Error("ENV USDT/VAULT/FROM_BLOCK belum di-set");
  const provider = new JsonRpcProvider(RPC);

  const latest = await provider.getBlockNumber();
  const inflowTopic = [TRANSFER_TOPIC, null, topicAddr(VAULT)];
  const outflowTopic = [TRANSFER_TOPIC, topicAddr(VAULT), null];

  const logs: { inflow: Log[]; outflow: Log[] } = { inflow: [], outflow: [] };

  for (let start = FROM_BLOCK; start <= latest; start += CHUNK + 1) {
    const end = Math.min(start + CHUNK, latest);

    const [inflow, outflow] = await Promise.all([
      provider.getLogs({ address: USDT, fromBlock: start, toBlock: end, topics: inflowTopic as any }),
      provider.getLogs({ address: USDT, fromBlock: start, toBlock: end, topics: outflowTopic as any }),
    ]);

    logs.inflow.push(...inflow);
    logs.outflow.push(...outflow);
  }

  // ambil timestamp utk setiap block (cache)
  const blockSet = new Set<number>();
  for (const l of [...logs.inflow, ...logs.outflow]) blockSet.add(l.blockNumber);
  const blockTs = new Map<number, number>();
  await Promise.all(
    Array.from(blockSet).map(async (bn) => {
      const b = await provider.getBlock(bn);
      if (b) blockTs.set(bn, b.timestamp);
    })
  );

  const days = new Map<Day, { inflow: bigint; outflow: bigint }>();
  const since7d = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;

  let vol7d = 0n;
  const uniq7d = new Set<string>();

  // inflow
  for (const l of logs.inflow) {
    const ts = blockTs.get(l.blockNumber)!;
    const day = toDay(ts);
    const amt = hexToBigInt(l.data);

    const cur = days.get(day) || { inflow: 0n, outflow: 0n };
    cur.inflow += amt;
    days.set(day, cur);

    if (ts >= since7d) {
      vol7d += amt;
      // indexed topic[1] = from
      const fromPadded = l.topics[1].toLowerCase();
      const from = "0x" + fromPadded.slice(26);
      uniq7d.add(from);
    }
  }

  // outflow
  for (const l of logs.outflow) {
    const ts = blockTs.get(l.blockNumber)!;
    const day = toDay(ts);
    const amt = hexToBigInt(l.data);
    const cur = days.get(day) || { inflow: 0n, outflow: 0n };
    cur.outflow += amt;
    days.set(day, cur);
  }

  // urutkan
  const sorted = Array.from(days.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));

  // akumulasi TVL
  let tvl = 0n;
  const rows: DailyRow[] = [];
  for (const [date, v] of sorted) {
    const net = v.inflow - v.outflow;
    tvl += net;
    rows.push({
      date,
      inflow: Number(v.inflow) / 10 ** USDT_DECIMALS,
      outflow: Number(v.outflow) / 10 ** USDT_DECIMALS,
      net: Number(net) / 10 ** USDT_DECIMALS,
    });
  }

  return {
    tvl: Number(tvl) / 10 ** USDT_DECIMALS,
    volume7d: Number(vol7d) / 10 ** USDT_DECIMALS,
    uniqueDepositors7d: uniq7d.size,
    days: rows,
  };
}
