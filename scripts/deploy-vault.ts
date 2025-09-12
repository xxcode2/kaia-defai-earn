import { ethers } from "hardhat";
import * as dotenv from "dotenv"; dotenv.config();

async function main() {
  const usdt = process.env.USDT!;
  const feeRecipient = process.env.FEE_RECIPIENT!;
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("USDT:", usdt);

  const VaultF = await ethers.getContractFactory("DefaiVault");
  const vaultDeployed = await VaultF.deploy(usdt, feeRecipient);
  await vaultDeployed.waitForDeployment();
  const vaultAddr = await vaultDeployed.getAddress();
  console.log("Vault deployed at:", vaultAddr);

  const vault = await ethers.getContractAt("DefaiVault", vaultAddr);

  const StratF = await ethers.getContractFactory("MockLinearYield");
  const strategyDeployed = await StratF.deploy(usdt, 0); // no virtual accrual
  await strategyDeployed.waitForDeployment();
  const strategyAddr = await strategyDeployed.getAddress();
  console.log("Strategy deployed at:", strategyAddr);

  const tx = await vault.setStrategy(strategyAddr);
  await tx.wait();
  console.log("Strategy set in Vault.");

  console.log("\nENV suggestions:");
  console.log(`VAULT=${vaultAddr}`);
  console.log(`STRATEGY=${strategyAddr}`);
}
main().catch(e=>{console.error(e);process.exit(1);});
