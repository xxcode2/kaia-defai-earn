// lib/eth.ts
import { ethers } from "ethers";

export function requireProvider() {
  const eth = (globalThis as any).ethereum;
  if (!eth) throw new Error("Wallet provider tidak tersedia. Install Kaia/Metamask.");
  return new ethers.BrowserProvider(eth);
}

export async function getSignerAndAddress(provider: ethers.BrowserProvider) {
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { signer, address };
}

export const toUnits = (val: string, decimals: number) => ethers.parseUnits(val, decimals);
export const formatUnits = (val: bigint, decimals: number) => ethers.formatUnits(val, decimals);

// Optional: auto-pindah jaringan ke Kairos
export async function ensureKairosNetwork() {
  const eth = (globalThis as any).ethereum;
  if (!eth) return;
  const KAIROS = {
    chainId: "0x3E9", // 1001
    chainName: "Kairos Testnet",
    rpcUrls: ["https://public-en-kairos.node.kaia.io"],
    nativeCurrency: { name: "Kaia", symbol: "KAIA", decimals: 18 },
    blockExplorerUrls: ["https://kairos.kaiascan.io"],
  };
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: KAIROS.chainId }] });
  } catch (e: any) {
    if (e?.code === 4902) {
      await eth.request({ method: "wallet_addEthereumChain", params: [KAIROS] });
    } else {
      throw e;
    }
  }
}
