// scripts/disable-fee.ts
import { ethers } from "hardhat"; import * as dotenv from "dotenv"; dotenv.config();
async function main(){ const v=await ethers.getContractAt("DefaiVault", process.env.VAULT!); const tx=await v.setFee(0); await tx.wait(); console.log("feeBps set to 0"); }
main().catch(e=>{console.error(e);process.exit(1);});
