// front-miniapp/scripts/export-dune.js
// Node ESM-compatible script (gunakan "type": "module" di package.json front-miniapp, Next.js default sdh ESM)

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createPublicClient, http, parseAbi, formatUnits } from 'viem';

// ==== ENV ====
const RPC = process.env.NEXT_PUBLIC_RPC_HTTP;
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1001);
const USDT = (process.env.NEXT_PUBLIC_USDT || '').toLowerCase();
const VAULT = (process.env.NEXT_PUBLIC_VAULT || '').toLowerCase();
const FROM_BLOCK_ENV = process.env.NEXT_PUBLIC_VAULT_FROM_BLOCK || '0';

if (!RPC || !USDT || !VAULT) {
  console.error('ENV kurang: NEXT_PUBLIC_RPC_HTTP / NEXT_PUBLIC_USDT / NEXT_PUBLIC_VAULT');
  process.exit(1);
}

const FROM_BLOCK = BigInt(FROM_BLOCK_ENV);
const BLOCK_CHUNK = 7500n;

// ==== ABI minimum ====
const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
]);

// ==== Helper ====
function fmt(nStr) { // string desimal -> tampil manis
  const [i, f] = (nStr || '0').split('.');
  const iFmt = Number(i || '0').toLocaleString();
  const fTrim = (f || '').replace(/0+$/, '');
  return fTrim ? `${iFmt}.${fTrim.slice(0, 4)}` : iFmt;
}
function ymd(tsMs) {
  const d = new Date(tsMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`; // UTC day binning
}

async function main() {
  console.log('→ Membuat public client…');
  const client = createPublicClient({ transport: http(RPC) });

  console.log('→ Baca token decimals…');
  const decimals = await client.readContract({
    address: USDT,
    abi: ERC20_ABI,
    functionName: 'decimals'
  });

  console.log('→ Baca TVL (balanceOf vault)…');
  const tvlRaw = await client.readContract({
    address: USDT,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [VAULT]
  });
  const tvl = formatUnits(tvlRaw, decimals);

  console.log('→ Ambil block terbaru…');
  const latest = await client.getBlockNumber();

  // Range scan
  let from = FROM_BLOCK > 0n ? FROM_BLOCK : (latest > 50000n ? latest - 50000n : 0n);
  let to = latest;

  console.log(`→ Scan logs Transfer USDT [${from} .. ${to}] dalam chunk ${Number(BLOCK_CHUNK)} block`);

  // aggregations
  let depositsSum = 0n;
  let withdrawalsSum = 0n;
  const uniqueDepositors = new Set();
  const dayAgg = {}; // { 'YYYY-MM-DD': { dep: bigint, wd: bigint, depositors: Set } }

  // scan loop
  for (let start = from; start <= to; start += (BLOCK_CHUNK + 1n)) {
    const end = start + BLOCK_CHUNK > to ? to : start + BLOCK_CHUNK;

    // Deposit (to == VAULT)
    const depLogs = await client.getLogs({
      address: USDT,
      fromBlock: start,
      toBlock: end,
      event: {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { indexed: true, name: 'from', type: 'address' },
          { indexed: true, name: 'to', type: 'address' },
          { indexed: false, name: 'value', type: 'uint256' }
        ]
      },
      args: { to: VAULT }
    });

    for (const lg of depLogs) {
      const value = lg.args?.value ?? 0n;
      const fromAddr = String(lg.args?.from || '').toLowerCase();
      depositsSum += value;
      if (fromAddr) uniqueDepositors.add(fromAddr);

      // daily agg by block timestamp
      const blk = await client.getBlock({ blockNumber: lg.blockNumber });
      const day = ymd(Number(blk.timestamp) * 1000);
      if (!dayAgg[day]) dayAgg[day] = { dep: 0n, wd: 0n, depositors: new Set() };
      dayAgg[day].dep += value;
      if (fromAddr) dayAgg[day].depositors.add(fromAddr);
    }

    // Withdraw (from == VAULT)
    const wLogs = await client.getLogs({
      address: USDT,
      fromBlock: start,
      toBlock: end,
      event: {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { indexed: true, name: 'from', type: 'address' },
          { indexed: true, name: 'to', type: 'address' },
          { indexed: false, name: 'value', type: 'uint256' }
        ]
      },
      args: { from: VAULT }
    });

    for (const lg of wLogs) {
      const value = lg.args?.value ?? 0n;
      withdrawalsSum += value;

      const blk = await client.getBlock({ blockNumber: lg.blockNumber });
      const day = ymd(Number(blk.timestamp) * 1000);
      if (!dayAgg[day]) dayAgg[day] = { dep: 0n, wd: 0n, depositors: new Set() };
      dayAgg[day].wd += value;
    }

    process.stdout.write(`  · scanned ${start}..${end}\r`);
  }
  process.stdout.write('\n');

  // === Write CSVs ===
  const outDir = path.resolve(process.cwd()); // tulis di folder kerja saat ini
  const snapPath = path.join(outDir, 'dune_current_snapshot.csv');
  const flowPath = path.join(outDir, 'dune_flow_daily.csv');

  console.log(`→ Tulis ${snapPath}`);
  const depositsFmt = formatUnits(depositsSum, decimals);
  const withdrawalsFmt = formatUnits(withdrawalsSum, decimals);
  const nowIso = new Date().toISOString();

  fs.writeFileSync(
    snapPath,
    [
      'updated_at,tvl_usdt,users,deposits_usdt,withdrawals_usdt,from_block,to_block,usdt_token,vault_address,chain_id',
      [
        nowIso,
        tvl,
        uniqueDepositors.size,
        depositsFmt,
        withdrawalsFmt,
        String(from),
        String(to),
        USDT,
        VAULT,
        CHAIN_ID
      ].join(',')
    ].join('\n'),
    'utf8'
  );

  console.log(`→ Tulis ${flowPath}`);
  const days = Object.keys(dayAgg).sort();
  const rows = [
    'date,deposits_usdt,withdrawals_usdt,daily_unique_depositors'
  ];
  for (const d of days) {
    const dep = formatUnits(dayAgg[d].dep, decimals);
    const wd = formatUnits(dayAgg[d].wd, decimals);
    const uniq = dayAgg[d].depositors.size;
    rows.push([d, dep, wd, uniq].join(','));
  }
  fs.writeFileSync(flowPath, rows.join('\n'), 'utf8');

  console.log('✅ Selesai!');
  console.log(`   Snapshot:   ${snapPath}`);
  console.log(`   Timeseries: ${flowPath}`);
}

main().catch((e) => {
  console.error('Export failed:', e?.message || e);
  process.exit(1);
});
