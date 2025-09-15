// lib/vault.ts
import { ethers } from "ethers";
import vaultJson from "@/lib/abi/DefaiVault.json"; // pastikan ada

export function vaultContract(address: string, signerOrProvider: any) {
  const abi = (vaultJson as any).abi ?? vaultJson;
  return new ethers.Contract(address, abi, signerOrProvider);
}

/** Ganti nama method-nya sesuai ABI kamu jika berbeda. */
export async function depositLocked(
  vaultAddr: string,
  amount: bigint,
  lockDays: number,
  signer: any
) {
  const c = vaultContract(vaultAddr, signer);
  // asumsi: function depositLocked(uint256 amount, uint256 lockDays)
  const tx = await c.depositLocked(amount, BigInt(lockDays));
  return await tx.wait();
}
