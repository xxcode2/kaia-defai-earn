// lib/erc20.ts
import { Contract } from "ethers";
import usdtJson from "@/lib/abi/USDT.json"; // pastikan path benar

export const TRANSFER_SIG = "Transfer(address,address,uint256)";
export const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export function erc20Contract(address: string, signerOrProvider: any) {
  // usdtJson bisa berupa { abi: [...] } atau langsung array ABI
  const abi = (usdtJson as any)?.abi ?? (usdtJson as any);
  return new Contract(address, abi, signerOrProvider);
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

/** Ambil address dari topic indexed (32-byte). */
export function topicAddr(topic: string): string {
  if (!topic || topic.length < 66) return "";
  // address = 20 byte terakhir dari topic 32 byte
  return ("0x" + topic.slice(26)).toLowerCase();
}

/** Hex 0x... -> bigint. */
export function hexToBigInt(hex: string | null | undefined): bigint {
  if (!hex) return 0n;
  return BigInt(hex);
}

/** Safe approve: jika token butuh reset ke 0 dulu, lakukan fallback otomatis. */
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
    const tx1 = await c.approve(spender, 0n);
    await tx1.wait();
    const tx2 = await c.approve(spender, amount);
    await tx2.wait();
  }
}
