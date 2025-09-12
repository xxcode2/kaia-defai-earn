import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

function mustAddr(label: string, v?: string) {
  if (!v) throw new Error(`Env ${label} is missing`);
  try { return ethers.getAddress(v); }
  catch { throw new Error(`Env ${label} invalid: ${v}`); }
}

async function main() {
  const USDT = mustAddr("USDT", process.env.USDT);
  const VAULT = mustAddr("VAULT", process.env.VAULT);
  const WHO   = mustAddr("WHO", process.env.WHO);

  const usdt  = await ethers.getContractAt("MockUSDT", USDT);
  const vault = await ethers.getContractAt("DefaiVault", VAULT);

  console.log("WHO:", WHO);

  // 1) Approve 1000 USDT
  const amt = ethers.parseUnits("1000", 6);
  let tx = await usdt.approve(VAULT, amt);
  await tx.wait();
  console.log("Approved 1000 USDT to Vault");

  // 2) Deposit 1000 USDT
  tx = await vault.deposit(amt);
  await tx.wait();
  console.log("Deposited 1000 USDT");

  // ganti bagian withdraw di scripts/test-deposit-withdraw.ts
const amount = ethers.parseUnits("200", 6);
const totAssets = await vault.totalAssets();
const totalShares = await vault.totalShares();
const sharesNeeded = (amount * totalShares) / totAssets;
tx = await vault.withdraw(sharesNeeded);
await tx.wait();
console.log("Withdrew ~200 USDT worth of shares");


  // --- Opsi: withdraw by amount (contoh 200 USDT) ---
  // const amount = ethers.parseUnits("200", 6);
  // const totAssets = await vault.totalAssets();
  // const totalShares = await vault.totalShares();
  // const sharesNeeded = (amount * totalShares) / totAssets;
  // tx = await vault.withdraw(sharesNeeded);
  // await tx.wait();
  // console.log("Withdrew ~200 USDT worth of shares");
}

main().catch((e) => { console.error(e); process.exit(1); });
