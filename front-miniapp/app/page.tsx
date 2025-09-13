"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { BrowserProvider, Contract, Log, formatUnits, parseUnits } from "ethers";
import usdtJson from "@/lib/abi/USDT.json";
import vaultJson from "@/lib/abi/DefaiVault.json";

/* ================== ENV ================== */
const VAULT = process.env.NEXT_PUBLIC_VAULT!;
const USDT = process.env.NEXT_PUBLIC_USDT!;
const FROM_BLOCK = Number(process.env.NEXT_PUBLIC_VAULT_FROM_BLOCK || "0");
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "1001");
const APY_PCT = Number(process.env.NEXT_PUBLIC_APY || "5");
const SCOPE = (process.env.NEXT_PUBLIC_SCOPE || "https://kairos.scope.kaia.io").replace(/\/+$/, "");

/* ===== Locked APY & Goal (optional) ===== */
const APY_LOCK_30 = Number(process.env.NEXT_PUBLIC_APY_LOCK_30 || "7");
const APY_LOCK_60 = Number(process.env.NEXT_PUBLIC_APY_LOCK_60 || "8.5");
const APY_LOCK_90 = Number(process.env.NEXT_PUBLIC_APY_LOCK_90 || "10");
const LOCKED_VAULT = process.env.NEXT_PUBLIC_LOCKED_VAULT || "";
const COMMUNITY_GOAL = Number(process.env.NEXT_PUBLIC_COMMUNITY_GOAL || "1000000"); // 1,000,000

/* ================== CONST ================== */
const SHARE_DECIMALS = 18;

// ABI event signatures
const EV_DEPOSIT =
  "event Deposit(address indexed user,uint256 assets,uint256 shares)";
const EV_WITHDRAW =
  "event Withdraw(address indexed user,uint256 assets,uint256 shares)";

/* ================== TYPES ================== */
type TabKey = "earn" | "missions" | "activity" | "profile" | "leaderboard";

type Mission = {
  id: string;
  title: string;
  pts: number;
  progress: number; // 0..100
  claimable: boolean;
  claimed: boolean;
};

type ChainActivity = {
  type: "Deposit" | "Withdraw";
  assets: number; // USDT readable
  shares: number; // shares readable
  txHash: string;
  blockNumber: number;
  user: string;
};

/* ================== UTILS ================== */
function fmt(n?: number, dp = 2) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: dp });
}
async function getProviderAndSigner() {
  if (!(window as any).ethereum) throw new Error("Wallet belum terpasang.");
  const provider = new BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();
  const net = await provider.getNetwork();
  if (CHAIN_ID && Number(net.chainId) !== CHAIN_ID) {
    console.warn(`⚠ Expected chainId ${CHAIN_ID}, got ${net.chainId}`);
  }
  return { provider, signer };
}
async function tryCall(c: any, fn: string, ...args: any[]) {
  if (!c || typeof c[fn] !== "function") return null;
  try {
    return await c[fn](...args);
  } catch {
    return null;
  }
}
function short(addr?: string, left = 6, right = 4) {
  if (!addr) return "—";
  return `${addr.slice(0, left)}…${addr.slice(-right)}`;
}

/* ========= Missions persist ========= */
const DEFAULT_MISSIONS: Mission[] = [
  { id: "m1", title: "Connect Wallet", pts: 50, progress: 0, claimable: false, claimed: false },
  { id: "m2", title: "Deposit ≥ 50 USDT", pts: 150, progress: 0, claimable: false, claimed: false },
  { id: "m3", title: "Try Withdraw", pts: 100, progress: 0, claimable: false, claimed: false },
];
const MISS_KEY = (addr: string) => `moreearn.missions:${addr?.toLowerCase() || "guest"}`;
function loadMissions(addr: string): Mission[] {
  try {
    const raw = localStorage.getItem(MISS_KEY(addr));
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) return parsed as Mission[];
  } catch {}
  return DEFAULT_MISSIONS;
}
function saveMissions(addr: string, data: Mission[]) {
  try {
    localStorage.setItem(MISS_KEY(addr), JSON.stringify(data));
  } catch {}
}

/* ================== PAGE ================== */
export default function Page() {
  const [tab, setTab] = useState<TabKey>("earn");
  useEffect(() => {
    const initial = (location.hash.replace("#", "") as TabKey) || "earn";
    const valid = ["earn", "missions", "activity", "profile", "leaderboard"];
    if (valid.includes(initial)) setTab(initial);
    const onHash = () => {
      const t = (location.hash.replace("#", "") as TabKey) || "earn";
      if (valid.includes(t)) setTab(t);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const changeTab = (t: TabKey) => {
    setTab(t);
    location.hash = t;
  };

  // wallet/basic states
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [assetDecimals, setAssetDecimals] = useState<number>(6);

  const [walletUSDT, setWalletUSDT] = useState<number>(0);
  const [vaultTVL, setVaultTVL] = useState<number>(0);

  // raw bigints (supaya konversi akurat)
  const [userSharesRaw, setUserSharesRaw] = useState<bigint>(0n);
  const [totalSharesRaw, setTotalSharesRaw] = useState<bigint>(0n);
  const [totalAssetsRaw, setTotalAssetsRaw] = useState<bigint>(0n);

  // readable numbers untuk UI
  const [userShares, setUserShares] = useState<number>(0);
  const [totalShares, setTotalShares] = useState<number>(0);
  const [totalAssets, setTotalAssets] = useState<number>(0);

  // earnings
  const [daily, setDaily] = useState<number>(0);
  const [monthly, setMonthly] = useState<number>(0);

  // forms
  const [depAmt, setDepAmt] = useState("100");
  const [wdAmt, setWdAmt] = useState("0");
  const [wdMode, setWdMode] = useState<"usdt" | "shares">("usdt"); // default USDT

  // Deposit plan (flex/locked)
  const [plan, setPlan] = useState<"flex" | "locked">("flex");
  const [lockDays, setLockDays] = useState<30 | 60 | 90>(30);
  const activeApy =
    plan === "flex"
      ? APY_PCT
      : lockDays === 30
      ? APY_LOCK_30
      : lockDays === 60
      ? APY_LOCK_60
      : APY_LOCK_90;

  // activity + pagination
  const [activity, setActivity] = useState<ChainActivity[]>([]);
  const [actLoading, setActLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;
  const totalPages = Math.max(1, Math.ceil(activity.length / PER_PAGE));
  const pageSlice = activity.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // missions
  const [missions, setMissions] = useState<Mission[]>(() => DEFAULT_MISSIONS);
  const userWithdrewRef = useRef(false);

  // derived
  const userAssetsEq = useMemo(() => {
    if (!totalShares || totalShares <= 0) return 0;
    const ratio = totalAssets / totalShares;
    return userShares * ratio;
  }, [userShares, totalShares, totalAssets]);

  const missionPts = useMemo(
    () => missions.filter((m) => m.claimed).reduce((s, m) => s + m.pts, 0),
    [missions]
  );

  // leaderboard from chain activity deposits
  const chainRanks = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of activity) {
      if (a.type !== "Deposit") continue;
      map.set(a.user, (map.get(a.user) || 0) + a.assets);
    }
    return Array.from(map.entries())
      .map(([addr, amt]) => ({ addr, pts: Math.floor(amt) }))
      .sort((a, b) => b.pts - a.pts);
  }, [activity]);

  const points = useMemo(() => 120 + missionPts, [missionPts]);

  const leaders = useMemo(() => {
    const list = chainRanks.slice(0, 100); // TOP 100
    const meIdx = list.findIndex((l) => l.addr.toLowerCase() === address?.toLowerCase());
    if (address) {
      if (meIdx >= 0) {
        list[meIdx] = { ...list[meIdx], pts: list[meIdx].pts + points };
      } else {
        list.push({ addr: address, pts: points });
      }
    }
    return list.sort((a, b) => b.pts - a.pts);
  }, [chainRanks, address, points]);

  /* ===== Missions persist (load/save) ===== */
  useEffect(() => {
    setMissions(loadMissions(address));
  }, [address]);
  useEffect(() => {
    saveMissions(address, missions);
  }, [address, missions]);

  /* ===== Refresh balances ===== */
  const refresh = useCallback(async () => {
    try {
      const { provider, signer } = await getProviderAndSigner();
      const me = await signer.getAddress();
      setAddress(me);

      const usdtRead: any = new Contract(USDT, usdtJson.abi, provider);
      const vaultRead: any = new Contract(VAULT, vaultJson.abi, provider);

      const aDec = Number((await tryCall(usdtRead, "decimals")) ?? 6);
      setAssetDecimals(aDec);

      const wBal = await tryCall(usdtRead, "balanceOf", me);
      setWalletUSDT(Number(formatUnits(wBal ?? 0n, aDec)));

      const tvlBal = await tryCall(usdtRead, "balanceOf", VAULT);
      setVaultTVL(Number(formatUnits(tvlBal ?? 0n, aDec)));

      const uShares = (await tryCall(vaultRead, "shares", me)) ?? 0n;
      const tShares = (await tryCall(vaultRead, "totalShares")) ?? 0n;
      const tAssets = (await tryCall(vaultRead, "totalAssets")) ?? 0n;

      setUserSharesRaw(uShares);
      setTotalSharesRaw(tShares);
      setTotalAssetsRaw(tAssets);

      setUserShares(Number(formatUnits(uShares, SHARE_DECIMALS)));
      setTotalShares(Number(formatUnits(tShares, SHARE_DECIMALS)));
      setTotalAssets(Number(formatUnits(tAssets, aDec)));

      // earnings
      const apy = APY_PCT / 100;
      const userAssets =
        tShares === 0n ? 0 : Number(formatUnits((uShares * tAssets) / tShares, aDec));
      setDaily((userAssets * apy) / 365);
      setMonthly((userAssets * apy) / 12);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ===== Auto-progress missions ===== */
  useEffect(() => {
    if (!address) return;
    setMissions((prev) =>
      prev.map((m) => (m.id === "m1" ? { ...m, progress: 100, claimable: !m.claimed } : m))
    );
  }, [address]);

  useEffect(() => {
    if (userAssetsEq >= 50) {
      setMissions((prev) =>
        prev.map((m) => (m.id === "m2" ? { ...m, progress: 100, claimable: !m.claimed } : m))
      );
    }
  }, [userAssetsEq]);

  /* ========== Actions ========== */
  async function onDeposit() {
    try {
      setLoading(true);
      const { signer } = await getProviderAndSigner();
      const usdt: any = new Contract(USDT, usdtJson.abi, signer);

      const me = await signer.getAddress();
      const assets = parseUnits(depAmt || "0", assetDecimals);

      // approve untuk vault target
      const targetVaultAddr = plan === "locked" ? (LOCKED_VAULT || VAULT) : VAULT;
      const allowance: bigint = (await tryCall(usdt, "allowance", me, targetVaultAddr)) ?? 0n;
      if (allowance < assets) {
        const txA = await usdt.approve(targetVaultAddr, assets);
        toast("Approving USDT…");
        await txA.wait();
      }

      const vaultTarget: any = new Contract(targetVaultAddr, vaultJson.abi, signer);

      if (plan === "locked") {
        const hasLockedFn =
          typeof vaultTarget["depositLocked"] === "function" ||
          typeof vaultTarget["depositLock"] === "function";

        if (hasLockedFn) {
          const fn = typeof vaultTarget["depositLocked"] === "function" ? "depositLocked" : "depositLock";
          const tx = await vaultTarget[fn](assets, lockDays);
          toast("Depositing (locked)...");
          await tx.wait();
        } else if (LOCKED_VAULT && targetVaultAddr === LOCKED_VAULT && typeof vaultTarget["deposit"] === "function") {
          const tx = await vaultTarget.deposit(assets);
          toast("Depositing to locked vault…");
          await tx.wait();
        } else {
          alert("Locked deposit not supported on this vault");
          setLoading(false);
          return;
        }
      } else {
        const flexVault: any = new Contract(VAULT, vaultJson.abi, signer);
        const tx = await flexVault.deposit(assets);
        toast("Depositing…");
        await tx.wait();
      }

      toast("Deposit success ✅");
      setTimeout(() => refresh(), 600);
    } catch (e: any) {
      console.error(e);
      alert(e?.reason || e?.message || "Deposit gagal");
    } finally {
      setLoading(false);
    }
  }

  async function onWithdraw() {
    try {
      setLoading(true);
      const { signer } = await getProviderAndSigner();
      const vault: any = new Contract(VAULT, vaultJson.abi, signer);

      let burnSharesRaw: bigint;

      if (wdMode === "shares") {
        let raw = parseUnits(wdAmt || "0", SHARE_DECIMALS);
        if (raw >= userSharesRaw && userSharesRaw > 0n) {
          raw = userSharesRaw - 1n;
        }
        burnSharesRaw = raw;
      } else {
        const assetsRaw = parseUnits(wdAmt || "0", assetDecimals);
        if (assetsRaw === 0n || totalAssetsRaw === 0n || totalSharesRaw === 0n) {
          alert("insufficient");
          setLoading(false);
          return;
        }
        let s = (assetsRaw * totalSharesRaw) / totalAssetsRaw;
        if (s > 0n) s = s + 1n;
        if (s >= userSharesRaw && userSharesRaw > 0n) {
          s = userSharesRaw - 1n;
        }
        burnSharesRaw = s;
      }

      const tx = await vault.withdraw(burnSharesRaw);
      toast("Withdrawing…");
      await tx.wait();
      toast("Withdraw success ✅");
      userWithdrewRef.current = true;

      setMissions((prev) =>
        prev.map((m) => (m.id === "m3" ? { ...m, progress: 100, claimable: !m.claimed } : m))
      );

      setTimeout(() => refresh(), 600);
    } catch (e: any) {
      console.error(e);
      alert(e?.reason || e?.message || "Withdraw gagal");
    } finally {
      setLoading(false);
    }
  }

  /* Wallet */
  async function connectWallet() {
    try {
      await (window as any).ethereum?.request?.({ method: "eth_requestAccounts" });
      await refresh();
      toast("Wallet connected");
    } catch (e: any) {
      alert(e?.message || "Connect failed");
    }
  }
  async function disconnectWallet() {
    try {
      await (window as any).ethereum?.request?.({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {}
    setAddress("");
    setUserShares(0);
    setDaily(0);
    setMonthly(0);
    toast("Disconnected");
  }

  /* Form helpers */
  function onMaxDeposit() {
    setDepAmt(String(Math.max(0, walletUSDT)));
  }
  function onMaxWithdraw() {
    if (wdMode === "shares") {
      const safe = userSharesRaw > 0n ? userSharesRaw - 1n : 0n;
      setWdAmt(formatUnits(safe, SHARE_DECIMALS));
    } else {
      if (totalAssetsRaw === 0n || totalSharesRaw === 0n || userSharesRaw === 0n) {
        setWdAmt("0");
        return;
      }
      const burn = userSharesRaw - 1n;
      const assetsOut = (burn * totalAssetsRaw) / totalSharesRaw;
      setWdAmt(formatUnits(assetsOut, assetDecimals));
    }
  }

  /* ====== ACTIVITY ====== */
  const fetchActivity = useCallback(async () => {
    try {
      setActLoading(true);
      const { provider } = await getProviderAndSigner();
      const vaultIface = new Contract(VAULT, vaultJson.abi).interface as any;
      const depTopic = vaultIface.getEvent(EV_DEPOSIT).topicHash;
      const wdTopic = vaultIface.getEvent(EV_WITHDRAW).topicHash;

      const logs: Log[] = await (provider as any).getLogs({
        address: VAULT,
        fromBlock: FROM_BLOCK || 0,
        toBlock: "latest",
        topics: [[depTopic, wdTopic]],
      });

      const parsed: ChainActivity[] = logs
        .map((lg) => {
          try {
            const p = vaultIface.parseLog(lg);
            if (!p) return null as any;
            const type = p.name as "Deposit" | "Withdraw";
            const user: string = p.args.user;
            const assets = Number(formatUnits(p.args.assets, assetDecimals));
            const shares = Number(formatUnits(p.args.shares, SHARE_DECIMALS));
            return { type, assets, shares, txHash: lg.transactionHash, blockNumber: lg.blockNumber, user };
          } catch {
            return null as any;
          }
        })
        .filter(Boolean)
        .sort((a, b) => b.blockNumber - a.blockNumber);

      setActivity(parsed);
      setPage(1);
    } catch (e) {
      console.error(e);
    } finally {
      setActLoading(false);
    }
  }, [assetDecimals]);

  useEffect(() => {
    if (tab === "activity" && activity.length === 0) fetchActivity();
  }, [tab, activity.length, fetchActivity]);

  /* ================== UI ================== */
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-slate-900">
      <div className="mx-auto max-w-7xl md:flex">
        {/* ===== SIDEBAR ===== */}
        <aside
          className={clsx(
            "sticky top-0 z-10 w-full border-b border-black/5 bg-white/80 backdrop-blur",
            "md:z-auto md:w-64 md:border-b-0 md:border-r md:h-svh md:bg-white/70"
          )}
        >
          <div className="mx-auto max-w-7xl md:max-w-none">
            <div className="flex items-center justify-between p-3 md:p-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 md:h-8 md:w-8 rounded-xl bg-emerald-500" />
                <div className="font-semibold tracking-tight">
                  More <span className="text-emerald-600">Earn</span>
                </div>
              </div>
              <div className="md:hidden flex items-center gap-2">
                {address ? (
                  <>
                    <span className="text-xs text-slate-500">{short(address)}</span>
                    <Button subtle size="sm" tone="dark" onClick={disconnectWallet}>
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button subtle size="sm" onClick={connectWallet}>
                    Connect
                  </Button>
                )}
              </div>
            </div>

            <div className="px-2 pb-2 md:px-4 md:pb-0">
              <div className="md:hidden px-2 pb-3">
                <MobileNav tab={tab} onChange={(t) => changeTab(t)} />
              </div>
              <nav className="hidden md:grid md:gap-1">
                <NavItem label="Earn" active={tab === "earn"} onClick={() => changeTab("earn")} />
                <NavItem label="Missions" active={tab === "missions"} onClick={() => changeTab("missions")} />
                <NavItem label="Activity" active={tab === "activity"} onClick={() => changeTab("activity")} />
                <NavItem label="Profile" active={tab === "profile"} onClick={() => changeTab("profile")} />
                <NavItem label="Leaderboard" active={tab === "leaderboard"} onClick={() => changeTab("leaderboard")} />
              </nav>

              <div className="hidden md:flex mt-auto items-center justify-between gap-2 text-xs text-slate-500 px-1 pt-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar address={address} />
                  <span className="truncate">{address ? short(address) : "Not connected"}</span>
                </div>
                {address ? (
                  <Button subtle size="sm" tone="dark" onClick={disconnectWallet}>
                    Disconnect
                  </Button>
                ) : (
                  <Button subtle size="sm" onClick={connectWallet}>
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* ===== MAIN ===== */}
        <main className="flex-1 p-4 md:p-8 space-y-8">
          {/* EARN */}
          {tab === "earn" && (
            <>
              <Hero />

              {/* Community Goal + Your Vault Balance (ring) */}
              <section className="grid md:grid-cols-2 gap-4">
                {/* Community goal donut */}
                <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
                  <div className="text-sm text-slate-500">Community Goal</div>
                  <div className="mt-4 flex items-center gap-6">
                    <div className="relative h-28 w-28">
                      <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="4"></circle>
                        <circle
                          cx="18" cy="18" r="15.5" fill="none"
                          stroke="rgb(16,185,129)" strokeWidth="4" strokeLinecap="round"
                          strokeDasharray={`${Math.max(0, Math.min(100, (vaultTVL / COMMUNITY_GOAL) * 100)).toFixed(2)}, 100`}
                        />
                      </svg>
                      <div className="absolute inset-3 rounded-full bg-white/90 grid place-items-center">
                        <div className="text-center">
                          <div className="text-[10px] uppercase tracking-wide text-slate-500">TVL</div>
                          <div className="text-sm font-semibold">{fmt(vaultTVL, 0)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-semibold">
                        {fmt(vaultTVL, 0)} / {fmt(COMMUNITY_GOAL, 0)} USDT
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-2 bg-emerald-500 rounded-full"
                          style={{ width: `${Math.max(0, Math.min(100, (vaultTVL / COMMUNITY_GOAL) * 100))}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {Math.max(0, Math.min(100, (vaultTVL / COMMUNITY_GOAL) * 100)).toFixed(1)}% reached
                      </div>
                    </div>
                  </div>
                </div>

                {/* Your balance animated ring */}
                <AnimatedBalance
                  label="Your Vault Balance"
                  value={userAssetsEq}
                  sub={`APY target ${APY_PCT}%`}
                  daily={daily}
                  monthly={monthly}
                />
              </section>

              <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Wallet USDT" value={`${fmt(walletUSDT)} USDT`} />
                <StatCard label="Vault TVL" value={`${fmt(vaultTVL)} USDT`} />
                <StatCard label="APY (target)" value={`${APY_PCT}%`} />
                <StatCard label="Your shares" value={fmt(userShares, 6)} />
              </section>

              <section className="grid md:grid-cols-2 gap-4">
                {/* Deposit with Flexible/Locked */}
                <Card title="Deposit">
                  <div className="mb-3 flex items-center gap-2">
                    <Button subtle tone={plan === "flex" ? "emerald" : "dark"} onClick={() => setPlan("flex")}>Flexible</Button>
                    <Button subtle tone={plan === "locked" ? "emerald" : "dark"} onClick={() => setPlan("locked")}>Locked</Button>
                    {plan === "locked" && (
                      <div className="ml-auto">
                        <select
                          value={lockDays}
                          onChange={(e) => setLockDays(Number(e.target.value) as 30 | 60 | 90)}
                          className="rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm focus:outline-none"
                        >
                          <option value={30}>30 days → {APY_LOCK_30}% APY</option>
                          <option value={60}>60 days → {APY_LOCK_60}% APY</option>
                          <option value={90}>90 days → {APY_LOCK_90}% APY</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <Input
                    value={depAmt}
                    onChange={(v) => setDepAmt(v)}
                    placeholder="0.00"
                    suffix={<Button subtle onClick={onMaxDeposit}>Max</Button>}
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Current APY: <b>{activeApy}%</b> {plan === "locked" && <>· Lock period: <b>{lockDays} days</b></>}
                  </div>
                  <Button className="mt-3" size="lg" onClick={onDeposit} disabled={loading || !address}>
                    {loading ? "Processing…" : "Deposit"}
                  </Button>
                  <p className="text-xs text-slate-500 mt-2">* Akan melakukan approve bila diperlukan.</p>
                </Card>

                {/* Withdraw */}
                <Card title="Withdraw">
                  <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                    <span className="mr-1">Input mode:</span>
                    <Button subtle size="sm" tone={wdMode === "usdt" ? "emerald" : "dark"} onClick={() => setWdMode("usdt")}>
                      USDT
                    </Button>
                    <Button subtle size="sm" tone={wdMode === "shares" ? "emerald" : "dark"} onClick={() => setWdMode("shares")}>
                      Shares
                    </Button>
                  </div>
                  <Input
                    value={wdAmt}
                    onChange={(v) => setWdAmt(v)}
                    placeholder="0.000000"
                    suffix={<Button subtle onClick={onMaxWithdraw}>Max</Button>}
                  />
                  <div className="mt-1 text-xs text-slate-500">
                    Mode: <b>{wdMode === "usdt" ? "USDT (assets)" : "Shares"}</b>
                  </div>
                  <Button
                    className="mt-3"
                    size="lg"
                    tone="dark"
                    onClick={onWithdraw}
                    disabled={loading || !address}
                  >
                    {loading ? "Processing…" : "Withdraw"}
                  </Button>
                  <p className="text-xs text-slate-500 mt-2">
                    * Withdraw membakar <b>shares</b> di kontrak; bila input USDT, sistem mengonversi otomatis.
                  </p>
                </Card>
              </section>
            </>
          )}

          {/* MISSIONS */}
          {tab === "missions" && (
            <section className="space-y-4">
              <SectionTitle>Missions</SectionTitle>
              <div className="grid lg:grid-cols-2 gap-4">
                {missions.map((m) => (
                  <MissionCard
                    key={m.id}
                    title={m.title}
                    pts={m.pts}
                    progress={m.progress}
                    claimable={m.claimable}
                    claimed={m.claimed}
                    onClaim={() => {
                      if (!m.claimable || m.claimed) return;
                      setMissions((prev) =>
                        prev.map((x) => (x.id === m.id ? { ...x, claimable: false, claimed: true } : x))
                      );
                      toast(`Claimed +${m.pts} pts`);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ACTIVITY */}
          {tab === "activity" && (
            <section className="space-y-4">
              <SectionTitle>Activity</SectionTitle>
              <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur p-3">
                <div className="overflow-x-auto rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <Th>Type</Th>
                        <Th>Address</Th>
                        <Th right>Assets (USDT)</Th>
                        <Th right>Shares</Th>
                        <Th>Tx</Th>
                      </tr>
                    </thead>
                    <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-black/5">
                      {actLoading ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500">
                            Loading on-chain activity…
                          </td>
                        </tr>
                      ) : pageSlice.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500">No activity.</td>
                        </tr>
                      ) : (
                        pageSlice.map((row, i) => (
                          <Tr key={`${row.txHash}-${i}`}>
                            <Td>{row.type}</Td>
                            <Td>
                              <a
                                className="text-emerald-600 hover:underline"
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  openInExplorer(row.user);
                                }}
                              >
                                {short(row.user)}
                              </a>
                            </Td>
                            <Td right>{fmt(row.assets, 6)}</Td>
                            <Td right>{fmt(row.shares, 6)}</Td>
                            <Td>
                              <a
                                className="text-emerald-600 hover:underline"
                                target="_blank"
                                href={`${SCOPE}/tx/${row.txHash}`}
                                rel="noreferrer"
                              >
                                {short(row.txHash)}
                              </a>
                            </Td>
                          </Tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Page {page} of {totalPages} · {activity.length} items
                  </span>
                  <div className="flex items-center gap-2">
                    <Button subtle size="sm" tone="dark" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      Prev
                    </Button>
                    <Button subtle size="sm" tone="dark" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                      Next
                    </Button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                * Data dari event <b>Deposit/Withdraw</b> Vault mulai block {FROM_BLOCK || 0}.
              </p>
            </section>
          )}

          {/* PROFILE */}
          {tab === "profile" && (
            <section className="space-y-6">
              <SectionTitle>Profile</SectionTitle>

              {/* Address + Points combined card */}
              <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
                <div className="grid lg:grid-cols-3 gap-4">
                  {/* Address tools */}
                  <div className="lg:col-span-1">
                    <div className="flex items-start gap-4">
                      <Avatar address={address} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-500">Address</div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 min-w-0 rounded-xl border border-black/10 bg-white/70 px-3 py-2 font-mono text-xs text-slate-700 overflow-hidden">
                            <div className="truncate">{address || "—"}</div>
                          </div>
                          {address ? (
                            <>
                              <IconButton label="Copy" onClick={() => address && navigator.clipboard?.writeText(address).then(() => toast("Copied"))}>
                                <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 15H8V7h11v13Z"/></svg>
                              </IconButton>
                              <IconButton label="Explorer" onClick={() => openInExplorer(address)}>
                                <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3ZM5 5h6v2H7v10h10v-4h2v6H5V5Z"/></svg>
                              </IconButton>
                              <Button subtle size="sm" tone="dark" onClick={disconnectWallet}>Disconnect</Button>
                            </>
                          ) : (
                            <Button subtle size="sm" onClick={connectWallet}>Connect</Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Points summary */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-500">Your Points</div>
                      <Pill tone="emerald">{tierLabel(120 + missionPts)} Tier</Pill>
                    </div>
                    <div className="mt-1 text-4xl font-semibold tracking-tight">{(120 + missionPts).toLocaleString()}</div>
                    <div className="mt-3 grid sm:grid-cols-3 gap-3">
                      <SmallStat label="From Missions" value={missionPts.toLocaleString()} />
                      <SmallStat label="From Deposits" value={"0"} />
                      <SmallStat label="Referrals" value="0" />
                    </div>
                    <TierProgress points={120 + missionPts} />
                    <div className="mt-2 text-xs text-slate-500">Points bersifat off-chain untuk gamifikasi.</div>
                  </div>
                </div>
              </div>

              {/* Referral */}
              <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
                <div className="flex items-center justify-between"><div className="font-medium">Referral</div><Pill tone="emerald">Off-chain points</Pill></div>
                <div className="mt-3 text-xs text-slate-500">Share your link to earn points</div>
                <div className="mt-2 rounded-xl border border-black/10 bg-white/60 p-3 break-all text-sm">{refLink(address)}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button subtle onClick={() => refLink(address) && navigator.clipboard?.writeText(refLink(address)).then(() => toast("Copied"))} disabled={!address}>Copy link</Button>
                  <Button subtle onClick={() => shareLink(refLink(address))} disabled={!address}>Share…</Button>
                </div>
              </div>
            </section>
          )}

          {/* LEADERBOARD */}
          {tab === "leaderboard" && (
            <section className="space-y-4">
              <SectionTitle>Leaderboard</SectionTitle>
              <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-4 shadow-sm">
                {leaders.length === 0 ? (
                  <div className="text-sm text-slate-500 p-4 text-center">No data yet. Make a deposit to appear here.</div>
                ) : (
                  <ol className="divide-y divide-black/5">
                    {leaders.map((l, idx) => (
                      <li key={l.addr + idx} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={clsx(
                              "w-8 h-8 rounded-full grid place-items-center text-sm font-semibold flex-none",
                              idx === 0 && "bg-amber-200",
                              idx === 1 && "bg-slate-200",
                              idx === 2 && "bg-orange-200",
                              idx > 2 && "bg-slate-100"
                            )}
                          >
                            {idx + 1}
                          </span>
                          <span className="text-sm truncate">
                            {address && l.addr.toLowerCase() === address.toLowerCase() ? short(address) + " (you)" : short(l.addr)}
                          </span>
                        </div>
                        <div className="text-sm font-semibold">{l.pts.toLocaleString()} pts</div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <p className="text-xs text-slate-500">Leaderboard dihitung dari total <b>Deposit</b> on-chain (USDT) + bonus points pribadimu.</p>
            </section>
          )}

          <footer className="py-6 text-center text-xs text-slate-500">
            Built for Kaia Wave Stablecoin Summer Hackathon
          </footer>
        </main>
      </div>

      {/* background dekoratif */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-emerald-200 blur-3xl opacity-40" />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full bg-teal-200 blur-3xl opacity-40" />
      </div>

      {/* toast container */}
      <div id="toast-root" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50" />
    </div>
  );
}

/* ================== PRIMITIVES & HELPERS ================== */
function Hero() {
  return (
    <section className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Grow your USDT the easy way</h1>
        </div>
        <Pill tone="emerald">Auto-compounding</Pill>
      </div>
    </section>
  );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-lg font-semibold">{children}</div>;
}
function NavItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors",
        active ? "bg-emerald-600 text-white shadow" : "text-slate-700 hover:bg-slate-100"
      )}
    >
      {label}
    </button>
  );
}
function MobileNav({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div className="relative">
      <select
        value={tab}
        onChange={(e) => onChange(e.target.value as TabKey)}
        className="w-full appearance-none rounded-xl border border-black/10 bg-white/90 px-3 py-2 pr-10 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 ring-emerald-200"
      >
        <option value="earn">Earn</option>
        <option value="missions">Missions</option>
        <option value="activity">Activity</option>
        <option value="profile">Profile</option>
        <option value="leaderboard">Leaderboard</option>
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 10l5 5 5-5H7z" />
      </svg>
    </div>
  );
}
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs shadow-sm", className)}>
      {children}
    </span>
  );
}
function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "emerald" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  } as const;
  return <span className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs border", tones[tone])}>{children}</span>;
}
function StatCard({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      {value === undefined ? (
        <div className="mt-2 h-7 rounded-md bg-slate-200/60 animate-pulse" />
      ) : (
        <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
      )}
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
      <div className="text-lg font-medium">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
function Button({
  children, onClick, size = "md", tone = "emerald", subtle = false, className, disabled = false,
}: {
  children: React.ReactNode; onClick?: () => void; size?: "md" | "lg" | "sm";
  tone?: "emerald" | "dark"; subtle?: boolean; className?: string; disabled?: boolean;
}) {
  const sizes = { sm: "px-2.5 py-1.5 text-sm", md: "px-3 py-2 text-sm", lg: "w-full py-3 text-base" } as const;
  const tones = {
    emerald: subtle ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-emerald-600 text-white hover:bg-emerald-700",
    dark: subtle ? "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200" : "bg-slate-900 text-white hover:bg-slate-800",
  } as const;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "rounded-xl font-medium shadow-sm border border-transparent active:translate-y-px transition-colors disabled:opacity-60",
        sizes[size], tones[tone], className
      )}
    >
      {children}
    </button>
  );
}
function IconButton({ children, onClick, label, disabled }: { children: React.ReactNode; onClick?: ()=>void; label?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      disabled={disabled}
      className={clsx("h-9 w-9 grid place-items-center rounded-xl border border-black/10 bg-white/80 text-slate-700 shadow-sm",
        "hover:bg-slate-50 active:translate-y-px disabled:opacity-60")}
    >
      {children}
    </button>
  );
}
function Input({ value, onChange, placeholder, prefix, suffix }: {
  value: string; onChange: (v: string) => void; placeholder?: string; prefix?: React.ReactNode; suffix?: React.ReactNode;
}) {
  return (
    <div className="flex items-stretch gap-2">
      {prefix}
      <div className="flex-1 relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          placeholder={placeholder}
          className="w-full rounded-xl border border-black/10 bg-white/70 placeholder:text-slate-400 px-3 py-2 pr-12 focus:outline-none focus:ring-2 ring-emerald-200"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          USDT
        </span>
      </div>
      {suffix}
    </div>
  );
}
function Th({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return <th className={clsx("px-4 py-2 text-left text-xs font-medium", right && "text-right")}>{children}</th>;
}
function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="bg-white/70">{children}</tr>;
}
function Td({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return <td className={clsx("px-4 py-3 align-middle", right && "text-right tabular-nums")}>{children}</td>;
}

/* === PROFILE HELPERS === */
function colorFromAddress(addr?: string) {
  if (!addr) return 200;
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) % 360;
  return h;
}
function Avatar({ address }: { address?: string }) {
  const hue = colorFromAddress(address);
  return (
    <div
      className="h-12 w-12 rounded-2xl shadow-inner border border-black/5 flex-none"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 80% 80%), hsl(${(hue + 60) % 360} 70% 70%))` }}
      title={address}
    />
  );
}
function openInExplorer(addr?: string) {
  if (!addr) return;
  window.open(`${SCOPE}/account/${addr}`, "_blank");
}
function refLink(addr?: string) {
  if (!addr) return "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}?ref=${addr}`;
}
function shareLink(url?: string) {
  if (!url) return;
  const text = "Join me on More Earn — simple USDT yield on Kaia";
  if ((navigator as any).share) {
    (navigator as any).share({ title: "More Earn", text, url }).catch(() => {});
  } else {
    toast("Sharing not supported — link copied");
    navigator.clipboard?.writeText(url);
  }
}
function SmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white/60 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
function tierLabel(points: number) {
  if (points >= 3000) return "Platinum";
  if (points >= 1500) return "Gold";
  if (points >= 500) return "Silver";
  return "Bronze";
}
function nextTierTarget(points: number) {
  if (points < 500) return 500;
  if (points < 1500) return 1500;
  if (points < 3000) return 3000;
  return 3000;
}
function TierProgress({ points }: { points: number }) {
  const target = nextTierTarget(points);
  const pct = Math.max(0, Math.min(100, (points / target) * 100));
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Progress to {tierLabel(target)}</span>
        <span>{Math.floor(pct)}%</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
        <div className="h-2 bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-xs text-slate-500">{points.toLocaleString()} / {target.toLocaleString()} pts</div>
    </div>
  );
}

/* === MISSION CARD === */
function MissionCard({
  title, pts, progress, claimable, claimed, onClaim,
}: {
  title: string; pts: number; progress: number; claimable: boolean; claimed: boolean; onClaim: () => void;
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="font-medium">{title}</div>
        <Badge>{pts} pts</Badge>
      </div>
      <div className="mt-3">
        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
          <div className="h-2 bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
        <div className="mt-2 text-xs text-slate-500">{progress}%</div>
      </div>
      <div className="mt-3">
        {claimed ? <Button subtle disabled>Claimed</Button> : claimable ? <Button onClick={onClaim}>Claim</Button> : <Button subtle disabled>In Progress</Button>}
      </div>
    </div>
  );
}

/* === Animated balance card === */
function AnimatedBalance({
  label, value, sub, daily, monthly,
}: {
  label: string;
  value: number;
  sub?: string;
  daily: number;
  monthly: number;
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>

      <div className="mt-4 flex items-center gap-5">
        {/* Ring berputar */}
        <div className="relative h-28 w-28">
          {/* ring dasar */}
          <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
          {/* ring animasi (spinner) */}
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          {/* isi tengah */}
          <div className="absolute inset-2 rounded-full bg-white grid place-items-center">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">USDT</div>
              <div className="text-sm font-semibold">{fmt(value, 2)}</div>
            </div>
          </div>
        </div>

        {/* Teks kanan */}
        <div className="flex-1">
          <div className="text-3xl font-semibold tracking-tight">{fmt(value, 2)} USDT</div>
          {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-black/5 bg-white/60 p-3">
              <div className="text-slate-500">Daily est.</div>
              <div className="mt-1 font-semibold">{fmt(daily, 4)} USDT</div>
            </div>
            <div className="rounded-xl border border-black/5 bg-white/60 p-3">
              <div className="text-slate-500">Monthly est.</div>
              <div className="mt-1 font-semibold">{fmt(monthly, 4)} USDT</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================== MINI TOAST ================== */
function toast(text: string) {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const el = document.createElement("div");
  el.className = "mb-2 rounded-xl bg-slate-900 text-white/95 px-3 py-2 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2";
  el.textContent = text;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add("opacity-0", "transition-opacity");
    setTimeout(() => el.remove(), 300);
  }, 1400);
}
