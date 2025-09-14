// lib/contract.ts
import {
  BrowserProvider,
  JsonRpcProvider,
  Contract,
  Interface,
  formatUnits,
  parseUnits,
  id,
  type Log,
} from "ethers";
import usdtJson from "@/lib/abi/USDT.json";
import vaultJson from "@/lib/abi/DefaiVault.json";

/* ========= ENV ========= */
const VAULT = process.env.NEXT_PUBLIC_VAULT!;
const USDT  = process.env.NEXT_PUBLIC_USDT!;
const FROM_BLOCK = Number(process.env.NEXT_PUBLIC_VAULT_FROM_BLOCK || "0");
const RPC = process.env.NEXT_PUBLIC_RPC || "";
const SHARE_DECIMALS = 18;

/* ========= Provider Helper ========= */
export function getProvider() {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    return new BrowserProvider((window as any).ethereum);
  }
  if (!RPC) {
    throw new Error("No provider available. Set NEXT_PUBLIC_RPC or open in a browser with wallet.");
  }
  return new JsonRpcProvider(RPC);
}

/* ========= Read/Write Contracts ========= */
export async function getReadContracts() {
  const provider: any = getProvider();
  const usdt  = new Contract(USDT,  (usdtJson as any).abi,  provider);
  const vault = new Contract(VAULT, (vaultJson as any).abi, provider);
  return { provider, usdt, vault };
}

export async function getWriteContracts() {
  const provider: any = getProvider();
  if (!("getSigner" in provider)) throw new Error("No signer available in this environment.");
  const signer = await (provider as BrowserProvider).getSigner();
  const usdt  = new Contract(USDT,  (usdtJson as any).abi,  signer);
  const vault = new Contract(VAULT, (vaultJson as any).abi, signer);
  return { provider, signer, usdt, vault };
}

/* ========= Approve if needed ========= */
export async function approveIfNeeded(owner: string, spender: string, amount: bigint, assetDecimals = 6) {
  const { usdt } = await getWriteContracts();
  const allowance: bigint = await usdt.allowance(owner, spender);
  if (allowance < amount) {
    const tx = await usdt.approve(spender, amount);
    await tx.wait();
    return true; // approved
  }
  return false; // already enough
}

/* ========= Deposit flexible (real) ========= */
export async function depositFlexible(amountStr: string, assetDecimals = 6) {
  const { signer, usdt, vault } = await getWriteContracts();
  const me = await signer.getAddress();
  const amount = parseUnits(amountStr || "0", assetDecimals);
  if (amount === 0n) throw new Error("Amount is zero");

  await approveIfNeeded(me, VAULT, amount, assetDecimals);
  const tx = await vault.deposit(amount);
  return tx.wait();
}

/* ========= Withdraw by USDT amount (convert to shares internally) ========= */
export async function withdrawByAssets(usdtAmountStr: string, assetDecimals = 6) {
  const { vault } = await getWriteContracts();

  const assetsRaw = parseUnits(usdtAmountStr || "0", assetDecimals);
  if (assetsRaw === 0n) throw new Error("Amount is zero");

  // Read totals to convert assets -> shares
  const provider: any = getProvider();
  const vaultRead = new Contract(VAULT, (vaultJson as any).abi, provider);

  const totalShares: bigint = await vaultRead.totalShares();
  const totalAssets: bigint = await vaultRead.totalAssets();

  if (totalAssets === 0n || totalShares === 0n) throw new Error("Vault has no liquidity");

  // shares = ceil(assets * totalShares / totalAssets) + 1 wei safety
  let shares = (assetsRaw * totalShares) / totalAssets;
  if (shares > 0n) shares = shares + 1n;

  const tx = await vault.withdraw(shares);
  return tx.wait();
}

/* ========= Activity (event logs) ========= */
// Pakai id("EventName(types)") untuk topic di ethers v6
const topicDeposit  = id("Deposit(address,uint256,uint256)");
const topicWithdraw = id("Withdraw(address,uint256,uint256)");
const iface = new Interface((vaultJson as any).abi);

export type ChainActivity = {
  type: "Deposit" | "Withdraw";
  user: string;
  assets: number;     // readable USDT
  shares: number;     // readable shares
  txHash: string;
  blockNumber: number;
};

/** Ambil semua activity deposit/withdraw dari log */
export async function getUserActivity(vaultAddr = VAULT, fromBlock = FROM_BLOCK, assetDecimals = 6): Promise<ChainActivity[]> {
  const provider: any = getProvider();

  const logs: Log[] = await provider.getLogs({
    address: vaultAddr,
    fromBlock: fromBlock || 0,
    toBlock: "latest",
    topics: [[topicDeposit, topicWithdraw]],
  });

  const rows: ChainActivity[] = logs
    .map((lg) => {
      try {
        const parsed = iface.parseLog(lg);
        if (!parsed) return null as any;
        const name = parsed.name as "Deposit" | "Withdraw";
        const user: string = parsed.args.user;
        const assets = Number(formatUnits(parsed.args.assets, assetDecimals));
        const shares = Number(formatUnits(parsed.args.shares, SHARE_DECIMALS));
        return {
          type: name,
          user,
          assets,
          shares,
          txHash: lg.transactionHash,
          blockNumber: lg.blockNumber,
        };
      } catch {
        return null as any;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.blockNumber - a.blockNumber);

  return rows;
}
