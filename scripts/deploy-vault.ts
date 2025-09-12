// scripts/deploy-vault.ts
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const usdtAddr =
    process.env.USDT ||
    process.env.NEXT_PUBLIC_USDT || // fallback ke env frontend
    "";

  if (!usdtAddr) {
    throw new Error("USDT address not set. Pastikan USDT di .env (USDT=0x...)");
  }

  console.log("Deployer:", deployer.address);
  console.log("USDT:", usdtAddr);

  // === Deploy DefaiVault (constructor: IERC20 _asset) ===
  const VaultFactory = await ethers.getContractFactory("DefaiVault");
  const vaultCtr = await VaultFactory.deploy(usdtAddr); // hanya 1 argumen
  await vaultCtr.waitForDeployment();

  const vaultAddr = await vaultCtr.getAddress();
  console.log("Vault deployed at:", vaultAddr);

  // Optional: set parameter awal (jika punya fungsi ini)
  // try {
  //   const tx1 = await vaultCtr.setDepositCap(0); await tx1.wait();
  //   const tx2 = await vaultCtr.setFee(0); await tx2.wait();
  //   console.log("Initialized: cap=0, fee=0");
  // } catch (e) {
  //   console.log("Init params skipped (method may not exist).");
  // }

  console.log("\nENV suggestions:");
  console.log(`VAULT=${vaultAddr}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
