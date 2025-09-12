import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const mock = await MockUSDT.deploy(deployer.address);
  await mock.waitForDeployment();

  const addr = await mock.getAddress();
  console.log("MockUSDT deployed at:", addr);

  const to = process.env.MINT_TO || deployer.address;
  const amountStr = process.env.MINT_AMOUNT || "1000000"; // 1,000,000 USDT (6dp)
  if (to && Number(amountStr) > 0) {
    const amount = ethers.parseUnits(amountStr, 6);
    const tx = await mock.mint(to, amount);
    await tx.wait();
    console.log(`Minted ${amountStr} USDT (6dp) to ${to}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
