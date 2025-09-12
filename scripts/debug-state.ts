import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

function must(label: string, v?: string) { if (!v) throw new Error(`Missing ${label}`); return v!; }

async function main() {
  const VAULT = must("VAULT", process.env.VAULT);
  const USDT  = must("USDT",  process.env.USDT);
  const [signer] = await ethers.getSigners();
  const me = process.env.WHO || await signer.getAddress();

  const vault = await ethers.getContractAt("DefaiVault", VAULT);
  const usdt  = await ethers.getContractAt("MockUSDT", USDT);

  const [myShares, totalShares, totAssets, vaultBal, stratAddr, feeBps] = await Promise.all([
    vault.shares(me),
    vault.totalShares(),
    vault.totalAssets(),
    usdt.balanceOf(VAULT),
    vault.strategy(),
    vault.feeBps(),
  ]);

  let stratAssets = 0n;
  let stratBal = 0n;
  if (stratAddr !== ethers.ZeroAddress) {
    const strat = await ethers.getContractAt("MockLinearYield", stratAddr);
    stratAssets = await strat.totalAssets();
    stratBal = await usdt.balanceOf(stratAddr);
  }

  console.log({ me, myShares: myShares.toString(), totalShares: totalShares.toString() });
  console.log({ totAssets: totAssets.toString(), vaultBal: vaultBal.toString(), feeBps: Number(feeBps) });
  console.log({ stratAddr, stratAssets: stratAssets.toString(), stratBal: stratBal.toString() });
}
main().catch(e => { console.error(e); process.exit(1); });
