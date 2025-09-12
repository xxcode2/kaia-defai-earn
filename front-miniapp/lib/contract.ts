// front-miniapp/lib/contract.ts
import { BrowserProvider, Contract, parseUnits, formatUnits } from "ethers";
import vaultJson from "./abi/DefaiVault.json";
import erc20Abi from "./abi/erc20.json";

const USDT = process.env.NEXT_PUBLIC_USDT!;
const VAULT = process.env.NEXT_PUBLIC_VAULT!;

const KAIA_KAIROS = {
  chainId: "0x3E9", // 1001
  chainName: "Kairos Testnet",
  rpcUrls: ["https://public-en-kairos.node.kaia.io"],
  nativeCurrency: { name: "KAIA", symbol: "KAIA", decimals: 18 },
  blockExplorerUrls: ["https://kairos.scope.kaia.io"],
};

export async function ensureKairos() {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("Wallet not found. Install MetaMask/Kaia Wallet.");
  const current = await eth.request({ method: "eth_chainId" });
  if (current !== KAIA_KAIROS.chainId) {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: KAIA_KAIROS.chainId }] });
    } catch (e: any) {
      if (e?.code === 4902) {
        await eth.request({ method: "wallet_addEthereumChain", params: [KAIA_KAIROS] });
      } else {
        throw e;
      }
    }
  }
}

export async function connectWallet(): Promise<string> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("Wallet not found. Install MetaMask/Kaia Wallet.");
  await ensureKairos();
  const provider = new BrowserProvider(eth);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  return signer.address;
}

export async function getState() {
  await ensureKairos();
  const provider = new BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();
  const addr = await signer.getAddress();

  const usdt = new Contract(USDT, erc20Abi as any, signer);
  const vault = new Contract(VAULT, (vaultJson as any).abi, signer);

  const [dec, balUSDT, myShares, totalAssets] = await Promise.all([
    usdt.decimals(),
    usdt.balanceOf(addr),
    vault.shares(addr),
    vault.totalAssets(),
  ]);

  return {
    address: addr,
    walletUSDT: Number(formatUnits(balUSDT, dec)),
    yourShares: myShares as bigint,
    totalAssets: Number(formatUnits(totalAssets, 6)),
  };
}

export async function depositUSDT(amount: string) {
  await ensureKairos();
  const provider = new BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();
  const addr = await signer.getAddress();

  const usdt = new Contract(USDT, erc20Abi as any, signer);
  const vault = new Contract(VAULT, (vaultJson as any).abi, signer);

  const dec = await usdt.decimals();
  const amt = parseUnits(amount, dec);
  const alw = await usdt.allowance(addr, VAULT);
  if (alw < amt) { const tx1 = await usdt.approve(VAULT, amt); await tx1.wait(); }

  const tx2 = await vault.deposit(amt);
  await tx2.wait();
}

export async function withdrawAmount(usdtAmount: string) {
  await ensureKairos();
  const provider = new BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();

  const vault = new Contract(VAULT, (vaultJson as any).abi, signer);

  const amount = parseUnits(usdtAmount, 6);
  const [totAssets, totalShares] = await Promise.all([vault.totalAssets(), vault.totalShares()]);
  if (totAssets === 0n || totalShares === 0n) throw new Error("Vault empty");
  const sharesNeeded = (amount * totalShares) / totAssets;

  const tx = await vault.withdraw(sharesNeeded);
  await tx.wait();
}
