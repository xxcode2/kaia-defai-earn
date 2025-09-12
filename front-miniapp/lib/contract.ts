"use client";
import { BrowserProvider, Contract, formatUnits, parseUnits, Interface, Log, JsonRpcProvider } from "ethers";
import vaultJson from "./abi/DefaiVault.json";
import erc20Abi from "./abi/erc20.json";

const USDT = process.env.NEXT_PUBLIC_USDT!;
const VAULT = process.env.NEXT_PUBLIC_VAULT!;
const APY = Number(process.env.NEXT_PUBLIC_APY || "5");
const SCOPE = process.env.NEXT_PUBLIC_SCOPE || "https://kairos.scope.kaia.io";

const KAIA = { chainId: "0x3E9", rpc: "https://public-en-kairos.node.kaia.io" };

export function explorerTx(tx: string) { return `${SCOPE}/tx/${tx}`; }

async function ensureKairos() {
  const eth = (window as any).ethereum; if (!eth) throw new Error("Install MetaMask/Kaia Wallet");
  const cid = await eth.request({ method: "eth_chainId" });
  if (cid !== KAIA.chainId) {
    try { await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: KAIA.chainId }] }); }
    catch (e:any) { if (e?.code === 4902) await eth.request({ method: "wallet_addEthereumChain", params: [{
      chainId: KAIA.chainId, chainName: "Kairos Testnet", rpcUrls: [KAIA.rpc],
      nativeCurrency: { name: "KAIA", symbol: "KAIA", decimals: 18 }, blockExplorerUrls: [SCOPE]
    }]}); else throw e; }
  }
}

export async function connectWallet(): Promise<string> {
  await ensureKairos();
  const provider = new BrowserProvider((window as any).ethereum);
  await provider.send("eth_requestAccounts", []);
  return (await provider.getSigner()).address;
}

export async function getState() {
  await ensureKairos();
  const provider = new BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();
  const addr = await signer.getAddress();

  const usdt = new Contract(USDT, erc20Abi as any, signer);
  const vault = new Contract(VAULT, (vaultJson as any).abi, signer);

  const [dec, balUSDT, shares, totalAssets, totalShares] = await Promise.all([
    usdt.decimals(), usdt.balanceOf(addr), vault.shares(addr), vault.totalAssets(), vault.totalShares()
  ]);

  const walletUSDT = Number(formatUnits(balUSDT, dec));
  const tvl = Number(formatUnits(totalAssets, 6));
  const yourShares = BigInt(shares);
  const tShares = BigInt(totalShares || 0);
  const userAssets = tShares === 0n ? 0 : Number(formatUnits((yourShares * BigInt(totalAssets)) / tShares, 6));

  // earnings (estimasi) dari APY
  const daily = userAssets * (APY/100) / 365;
  const monthly = daily * 30;

  return { address: addr, walletUSDT, tvl, userAssets, yourShares, totalShares: tShares, apy: APY, daily, monthly };
}

export async function depositUSDT(amount: string) {
  await ensureKairos();
  const provider = new BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner(); const me = await signer.getAddress();
  const usdt = new Contract(USDT, erc20Abi as any, signer);
  const vault = new Contract(VAULT, (vaultJson as any).abi, signer);

  const dec = await usdt.decimals(); const amt = parseUnits(amount, dec);
  const alw = await usdt.allowance(me, VAULT);
  if (alw < amt) { const tx1 = await usdt.approve(VAULT, amt); await tx1.wait(); }
  const tx2 = await vault.deposit(amt); const r = await tx2.wait();

  // referral once on first deposit
  const ref = localStorage.getItem("ref");
  if (ref && ref !== me) {
    try { if ((vault as any).recordReferral) { const t = await (vault as any).recordReferral(ref, amt); await t.wait(); } }
    catch { /* optional */ }
  }
  return r?.hash;
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

  const tx = await vault.withdraw(sharesNeeded); const r = await tx.wait();
  return r?.hash;
}

// === Activity (query event logs dari chain) ===
const iface = new Interface((vaultJson as any).abi);
const topicDeposit  = iface.getEvent("Deposit").topicHash;
const topicWithdraw = iface.getEvent("Withdraw").topicHash;

export async function getUserActivity(addr: string) {
  const rpc = new JsonRpcProvider(KAIA.rpc);              // ✅ gunakan RPC publik
  const VAULT = (process.env.NEXT_PUBLIC_VAULT || "").toLowerCase();
  const logs: Log[] = await rpc.getLogs({
    address: VAULT,
    topics: [[topicDeposit, topicWithdraw]],
    fromBlock: 0,                                         // aman untuk Kairos
    toBlock: "latest",
  });

    const items = logs.map((l) => {
    const ev = iface.parseLog(l)!;
    const type = ev.name; // Deposit / Withdraw
    const user = (ev.args[0] as string).toLowerCase();
    if (user !== addr.toLowerCase()) return null;
    const assets = Number(formatUnits(ev.args[1], 6));
    return { type, assets, tx: l.transactionHash, block: Number(l.blockNumber) };
  }).filter(Boolean) as any[];

  return items.reverse();
}

// === Referral helper ===
export function captureReferralFromURL() {
  const url = new URL(window.location.href);
  const ref = url.searchParams.get("ref");
  if (ref) localStorage.setItem("ref", ref);
}
