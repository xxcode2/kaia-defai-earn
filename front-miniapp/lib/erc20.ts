// lib/erc20.ts
import { ethers } from "ethers";
import usdtJson from "@/lib/abi/USDT.json"; // pastikan ada
import { formatUnits } from "./eth";

export function erc20Contract(address: string, signerOrProvider: any) {
  return new ethers.Contract(address, usdtJson.abi ?? usdtJson, signerOrProvider);
}

export async function getAllowance(
  tokenAddr: string,
  owner: string,
  spender: string,
  provider: any
) {
  const c = erc20Contract(tokenAddr, provider);
  const allowance: bigint = await c.allowance(owner, spender);
  return allowance;
}

/** Safe approve: jika token non-standar butuh set 0 dulu, fallback otomatis. */
export async function safeApprove(
  tokenAddr: string,
  spender: string,
  amount: bigint,
  signer: any
) {
  const c = erc20Contract(tokenAddr, signer);
  try {
    const tx = await c.approve(spender, amount);
    await tx.wait();
    return;
  } catch (e: any) {
    // Fallback: set ke 0 lalu set ke amount
    try {
      const tx1 = await c.approve(spender, 0n);
      await tx1.wait();
      const tx2 = await c.approve(spender, amount);
      await tx2.wait();
      return;
    } catch (e2) {
      throw e2;
    }
  }
}
