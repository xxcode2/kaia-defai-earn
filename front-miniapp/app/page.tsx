"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  BrowserProvider,
  Contract,
  Log,
  formatUnits,
  parseUnits,
} from "ethers";
import usdtJson from "@/lib/abi/USDT.json";
import vaultJson from "@/lib/abi/DefaiVault.json";
import Image from "next/image";

/* ================== ENV ================== */
const VAULT = process.env.NEXT_PUBLIC_VAULT!;
const USDT = process.env.NEXT_PUBLIC_USDT!;
const FROM_BLOCK = Number(process.env.NEXT_PUBLIC_VAULT_FROM_BLOCK || "0");
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "1001");
const APY_PCT = Number(process.env.NEXT_PUBLIC_APY || "5");
const SCOPE = (process.env.NEXT_PUBLIC_SCOPE || "https://kairos.scope.kaia.io").replace(/\/+$/, "");

/* ================== CONST ================== */
const SHARE_DECIMALS = 18;
const COMMUNITY_GOAL = 1_000_000; // USDT target goal

// ABI event signatures (untuk membaca aktivitas dari log)
const EV_DEPOSIT = "event Deposit(address indexed user,uint256 assets,uint256 shares)";
const EV_WITHDRAW = "event Withdraw(address indexed user,uint256 assets,uint256 shares)";

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
  assets: number;
  shares: number;
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
  { id: "m1",  title: "Connect Wallet",                 pts: 50,  progress: 0, claimable: false, claimed: false },
  { id: "m2",  title: "First Deposit ≥ 50 USDT",        pts: 150, progress: 0, claimable: false, claimed: false },
  { id: "m3",  title: "Try Withdraw",                   pts: 100, progress: 0, claimable: false, claimed: false },
  { id: "m4",  title: "Reach 500 USDT (personal)",      pts: 120, progress: 0, claimable: false, claimed: false },
  { id: "m5",  title: "Reach 1,000 USDT (personal)",    pts: 200, progress: 0, claimable: false, claimed: false },
  { id: "m6",  title: "Make 3 Deposits",                pts: 150, progress: 0, claimable: false, claimed: false },
  { id: "m7",  title: "Stay Staked for 7 days",         pts: 150, progress: 0, claimable: false, claimed: false },
  { id: "m8",  title: "Use Locked (Demo) once",         pts: 80,  progress: 0, claimable: false, claimed: false },
  { id: "m9",  title: "Top 100 Leaderboard (any time)", pts: 250, progress: 0, claimable: false, claimed: false },
  { id: "m10", title: "Share Referral Link",            pts: 100, progress: 0, claimable: false, claimed: false },
  { id: "m11",  title: "Reach 10,000 USDT (personal)",    pts: 200, progress: 0, claimable: false, claimed: false },
  { id: "m11",  title: "Reach 15,000 USDT (personal)",    pts: 200, progress: 0, claimable: false, claimed: false },
];

const MISS_KEY = (addr: string) => `moreearn.missions:${addr?.toLowerCase() || "guest"}`;
function loadMissions(addr: string): Mission[] {
  try {
    const raw = localStorage.getItem(MISS_KEY(addr));
    const parsed = raw ? JSON.parse(raw) : null;
    return mergeMissions(parsed);
  } catch {}
  return DEFAULT_MISSIONS;
}

function mergeMissions(saved: Mission[] | null): Mission[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_MISSIONS;
  // gabungkan berdasarkan id: data lama dipertahankan, misi baru di-inject
  const byId = new Map(saved.map(m => [m.id, m]));
  return DEFAULT_MISSIONS.map(def => {
    const old = byId.get(def.id);
    return old ? { ...def, ...old } : def;
  });
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

  // shares/assets raw
  const [userSharesRaw, setUserSharesRaw] = useState<bigint>(0n);
  const [totalSharesRaw, setTotalSharesRaw] = useState<bigint>(0n);
  const [totalAssetsRaw, setTotalAssetsRaw] = useState<bigint>(0n);

  // readable
  const [userShares, setUserShares] = useState<number>(0);
  const [totalShares, setTotalShares] = useState<number>(0);
  const [totalAssets, setTotalAssets] = useState<number>(0);

  // earnings
  const [daily, setDaily] = useState<number>(0);
  const [monthly, setMonthly] = useState<number>(0);

  // forms
  const [depAmt, setDepAmt] = useState("100");
  const [wdAmt, setWdAmt] = useState("0");

  // earn mode
  type EarnMode = "flexible" | "locked";
  const [earnMode, setEarnMode] = useState<EarnMode>("flexible");
  const LOCKED_OPTIONS = [
    { id: "l30", label: "30 days → 7% APY", apy: 7 },
    { id: "l60", label: "60 days → 8.5% APY", apy: 8.5 },
    { id: "l90", label: "90 days → 10% APY", apy: 10 },
  ];
  const [lockedPlan, setLockedPlan] = useState<string>(LOCKED_OPTIONS[0].id);

  // demo: catatan locked positions (off-chain)
  const [lockedPositions, setLockedPositions] = useState<
    { plan: string; amount: number; start: number }[]
  >([]);

  // activity + pagination
  const [activity, setActivity] = useState<ChainActivity[]>([]);
  const [actLoading, setActLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;
  const totalPages = Math.max(1, Math.ceil(activity.length / PER_PAGE));
  const pageSlice = activity.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // missions
  const [missions, setMissions] = useState<Mission[]>(() => DEFAULT_MISSIONS);
  const depositCountRef = useRef(0);
  const connectedAtRef = useRef<number | null>(null);

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

  // leaderboard dari chain deposits
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

  const basePoints = 120; // contoh poin dasar off-chain
  const totalPoints = useMemo(() => basePoints + missionPts, [missionPts]);

  const leaders = useMemo(() => {
    // top 100
    const list = chainRanks.slice(0, 100);
    const meIdx = list.findIndex((l) => l.addr.toLowerCase() === address?.toLowerCase());
    if (address) {
      if (meIdx >= 0) {
        list[meIdx] = { ...list[meIdx], pts: list[meIdx].pts + totalPoints };
      } else {
        list.push({ addr: address, pts: totalPoints });
      }
    }
    return list.sort((a, b) => b.pts - a.pts);
  }, [chainRanks, address, totalPoints]);

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
    // m1 connect
    setMissions((prev) =>
      prev.map((m) => (m.id === "m1" ? { ...m, progress: 100, claimable: !m.claimed } : m))
    );
    connectedAtRef.current = Date.now();
  }, [address]);

  useEffect(() => {
    // m4 & m5: personal TVL thresholds
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id === "m4") {
          const done = userAssetsEq >= 500;
          return { ...m, progress: done ? 100 : Math.min(100, (userAssetsEq / 500) * 100), claimable: done && !m.claimed };
        }
        if (m.id === "m5") {
          const done = userAssetsEq >= 1000;
          return { ...m, progress: done ? 100 : Math.min(100, (userAssetsEq / 1000) * 100), claimable: done && !m.claimed };
        }
        return m;
      })
    );
  }, [userAssetsEq]);

  useEffect(() => {
    // m7 stay staked 7 days (simulasi: kalau connected > 1 menit, anggap complete)
    const t = setInterval(() => {
      if (!connectedAtRef.current) return;
      const mins = (Date.now() - connectedAtRef.current) / 60000;
      if (mins >= 1) {
        setMissions((prev) =>
          prev.map((m) => (m.id === "m7" ? { ...m, progress: 100, claimable: !m.claimed } : m))
        );
      }
    }, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // m9: top 100 leaderboard
    const idx = leaders.findIndex((l) => address && l.addr.toLowerCase() === address.toLowerCase());
    if (idx >= 0 && idx < 100) {
      setMissions((prev) =>
        prev.map((m) => (m.id === "m9" ? { ...m, progress: 100, claimable: !m.claimed } : m))
      );
    }
  }, [leaders, address]);

  /* ========== Actions ========== */
  async function onDepositFlexible() {
    try {
      setLoading(true);
      const { signer } = await getProviderAndSigner();
      const usdt: any = new Contract(USDT, usdtJson.abi, signer);
      const vault: any = new Contract(VAULT, vaultJson.abi, signer);
      const me = await signer.getAddress();

      const assets = parseUnits(depAmt || "0", assetDecimals);

      const allowance: bigint = (await tryCall(usdt, "allowance", me, VAULT)) ?? 0n;
      if (allowance < assets) {
        const txA = await usdt.approve(VAULT, assets);
        toast("Approving USDT…");
        await txA.wait();
      }

      const tx = await vault.deposit(assets);
      toast("Depositing…");
      await tx.wait();
      toast("Deposit success ✅");

      // missions: first deposit + deposit counter
      depositCountRef.current += 1;
      setMissions((prev) =>
        prev.map((m) => {
          if (m.id === "m2") {
            const ok = Number(depAmt) >= 50;
            return { ...m, progress: ok ? 100 : m.progress, claimable: ok && !m.claimed };
          }
          if (m.id === "m6") {
            const prog = Math.min(100, (depositCountRef.current / 3) * 100);
            return { ...m, progress: prog, claimable: prog >= 100 && !m.claimed };
          }
          return m;
        })
      );

      setTimeout(() => refresh(), 600);
    } catch (e: any) {
      console.error(e);
      alert(e?.reason || e?.message || "Deposit gagal");
    } finally {
      setLoading(false);
    }
  }

  function onDepositLockedDemo() {
    // Simulasi: tidak memanggil kontrak. Tampilkan toast + ubah missions.
    const plan = LOCKED_OPTIONS.find((p) => p.id === lockedPlan)?.label || "Locked plan";
    const amt = Number(depAmt || "0");
    if (!amt || amt <= 0) {
      alert("Masukkan jumlah deposit");
      return;
    }
    toast("Locked deposit (Demo) recorded ✅");
    setLockedPositions((arr) => [...arr, { plan: plan, amount: amt, start: Date.now() }]);
    // missions
    setMissions((prev) =>
      prev.map((m) => (m.id === "m8" ? { ...m, progress: 100, claimable: !m.claimed } : m))
    );
    // Optional: hitung juga sebagai deposit count untuk m6
    depositCountRef.current += 1;
    setMissions((prev) =>
      prev.map((m) => (m.id === "m6" ? { ...m, progress: Math.min(100, (depositCountRef.current / 3) * 100), claimable: depositCountRef.current >= 3 && !m.claimed } : m))
    );
  }

  async function onWithdrawUSDT() {
    try {
      setLoading(true);
      const { signer } = await getProviderAndSigner();
      const vault: any = new Contract(VAULT, vaultJson.abi, signer);

      const assetsRaw = parseUnits(wdAmt || "0", assetDecimals);
      if (assetsRaw === 0n || totalAssetsRaw === 0n || totalSharesRaw === 0n) {
        alert("insufficient");
        setLoading(false);
        return;
      }

      // shares = ceil(assets * totalShares / totalAssets) + 1 wei safety
      let s = (assetsRaw * totalSharesRaw) / totalAssetsRaw;
      if (s > 0n) s = s + 1n;
      if (s >= userSharesRaw && userSharesRaw > 0n) {
        s = userSharesRaw - 1n;
      }

      const tx = await vault.withdraw(s);
      toast("Withdrawing…");
      await tx.wait();
      toast("Withdraw success ✅");

      // missions withdraw
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
    // maksimal USDT dari shares user (minus 1 wei share)
    if (totalAssetsRaw === 0n || totalSharesRaw === 0n || userSharesRaw === 0n) {
      setWdAmt("0");
      return;
    }
    const burn = userSharesRaw - 1n;
    const assetsOut = (burn * totalAssetsRaw) / totalSharesRaw;
    setWdAmt(formatUnits(assetsOut, assetDecimals));
  }

  /* ====== ACTIVITY ====== */
  const fetchActivity = useCallback(async () => {
    try {
      setActLoading(true);
      const { provider } = await getProviderAndSigner();
      const vaultIface = new Contract(VAULT, vaultJson.abi).interface as any;
const depTopic = (vaultIface.getEvent(EV_DEPOSIT) as any)?.topicHash as string;
const wdTopic  = (vaultIface.getEvent(EV_WITHDRAW) as any)?.topicHash as string;
if (!depTopic || !wdTopic) throw new Error("Invalid ABI");


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
  <Image
    src="/brand/more.png"      // path relatif dari /public
    alt="More Earn"
    width={32}
    height={32}
    className="rounded-xl"     // kalau mau tetap rounded
    priority
  />
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

              <div className="hidden md:flex mt-6 items-center justify-between gap-2 text-xs text-slate-500 px-1">
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
              {/* top ring + goal */}
              <section className="grid md:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
                  <div className="text-sm text-slate-500">TVL</div>
                  <div className="mt-3 flex items-center gap-6">
                    <Ring label="TVL" value={vaultTVL} unit="USDT" />
                    <div>
                      <div className="text-xl font-semibold tracking-tight">{fmt(vaultTVL)} USDT</div>
                      <div className="text-xs text-slate-500">of {fmt(COMMUNITY_GOAL)} USDT goal</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
                  <div className="text-sm text-slate-500">Community Goal</div>
                  <div className="mt-2 text-lg">
                    {fmt(vaultTVL)} / {fmt(COMMUNITY_GOAL)} USDT
                  </div>
                  <ProgressBar pct={Math.min(100, (vaultTVL / COMMUNITY_GOAL) * 100)} />
                </div>
              </section>

              <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Wallet USDT" value={`${fmt(walletUSDT)} USDT`} />
                <StatCard label="Vault TVL" value={`${fmt(vaultTVL)} USDT`} />
                <StatCard label="APY (target)" value={`${APY_PCT}%`} />
                <StatCard label="Your shares" value={fmt(userShares, 6)} />
              </section>

              {/* Deposit / Withdraw */}
              <section className="grid md:grid-cols-2 gap-4">
                {/* Deposit */}
                <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-medium">Deposit</div>
                    <div className="flex items-center gap-2">
                      <Button
                        subtle
                        size="sm"
                        tone={earnMode === "flexible" ? "emerald" : "dark"}
                        onClick={() => setEarnMode("flexible")}
                      >
                        Flexible
                      </Button>
                      <Button
                        subtle
                        size="sm"
                        tone={earnMode === "locked" ? "emerald" : "dark"}
                        onClick={() => setEarnMode("locked")}
                      >
                        Locked
                      </Button>
                    </div>
                  </div>

                  {earnMode === "locked" && (
                    <div className="mt-3">
                      <select
                        value={lockedPlan}
                        onChange={(e) => setLockedPlan(e.target.value)}
                        className="w-full rounded-xl border border-black/10 bg-white/90 px-3 py-2 text-sm"
                      >
                        {LOCKED_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="mt-3">
                    <Input
                      value={depAmt}
                      onChange={(v) => setDepAmt(v)}
                      placeholder="0.00"
                      suffix={<Button subtle onClick={onMaxDeposit}>Max</Button>}
                    />
                  </div>
                  <Button
                    className="mt-3"
                    size="lg"
                    onClick={earnMode === "flexible" ? onDepositFlexible : onDepositLockedDemo}
                    disabled={loading || !address}
                  >
                    {loading ? "Processing…" : "Deposit"}
                  </Button>

                  {earnMode === "locked" && (
                    <p className="mt-2 text-xs text-amber-700">
                      * Locked mode adalah <b>demo/simulasi off-chain</b> untuk keperluan presentasi. Dana tetap disimpan
                      di vault flexible, namun kamu mendapatkan progress mission & catatan plan.
                    </p>
                  )}
                </div>

                {/* Withdraw */}
                <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
                  <div className="text-lg font-medium">Withdraw</div>
                  <div className="mt-3">
                    <Input
                      value={wdAmt}
                      onChange={(v) => setWdAmt(v)}
                      placeholder="0.00"
                      suffix={<Button subtle onClick={onMaxWithdraw}>Max</Button>}
                    />
                  </div>
          
                  <Button
                    className="mt-3"
                    size="lg"
                    tone="dark"
                    onClick={onWithdrawUSDT}
                    disabled={loading || !address}
                  >
                    {loading ? "Processing…" : "Withdraw"}
                  </Button>
                </div>
              </section>

              {/* About Earn */}
              <section className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
                <div className="text-lg font-medium">About Earn</div>
                <ul className="mt-2 space-y-2 text-sm text-slate-700 list-disc pl-5">
                  <li>The vault accepts <b>USDT</b>. Upon deposit, you receive <b>shares</b> proportional shares.</li>
                  <li>Share value increases as the strategy yields results (auto-compounding). APY target: {APY_PCT}%.</li>
                  <li>Withdrawals are input in <b>USDT</b> — the system automatically converts the amount into shares, which are then burned.</li>
                  <li>All transactions are recorded on-chain and can be tracked via the tab. <b>Activity</b>.</li>
                </ul>
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

            
            </section>
          )}

          {/* PROFILE */}
          {tab === "profile" && (
            <section className="space-y-6">
              <SectionTitle>Profile</SectionTitle>

              {/* Your Vault Balance */}
              <AnimatedBalance label="Your Vault Balance" value={+fmt(userAssetsEq, 2).replace(/,/g, "")} sub={`APY target ${APY_PCT}%`} daily={daily} monthly={monthly} />

              {/* Points & Badges */}
              <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-500">Your Points</div>
                  <Pill tone="emerald">{tierLabel(totalPoints)} Tier</Pill>
                </div>
                <div className="mt-2 text-4xl font-semibold tracking-tight">{totalPoints.toLocaleString()}</div>

                <div className="mt-3 grid sm:grid-cols-3 gap-3">
                  <SmallStat label="From Missions" value={missionPts.toLocaleString()} />
                  <SmallStat label="From Deposits" value={"0"} />
                  <SmallStat label="Referrals" value={"0"} />
                </div>

                <TierProgress points={totalPoints} />
                <div className="mt-3">
                  <div className="text-sm text-slate-500 mb-2">Badges</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Badge className="justify-center">Bronze</Badge>
                    <Badge className={clsx("justify-center", totalPoints >= 500 ? "" : "opacity-50")}>Silver</Badge>
                    <Badge className={clsx("justify-center", totalPoints >= 1000 ? "" : "opacity-50")}>Gold</Badge>
                    <Badge className={clsx("justify-center", totalPoints >= 2000 ? "" : "opacity-50")}>Diamond</Badge>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">Badges will automatically unlock once your total points surpass the tier threshold.</div>
                </div>
              </div>

              {/* Referral */}
              <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Referral</div>
                  <Pill tone="emerald">Off-chain points</Pill>
                </div>
                <div className="mt-3 text-xs text-slate-500">Share your link to earn points</div>
                <div className="mt-2 rounded-xl border border-black/10 bg-white/60 p-3 break-all text-sm">{refLink(address)}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    subtle
                    onClick={() => {
                      const link = refLink(address);
                      if (link) {
                        navigator.clipboard?.writeText(link).then(() => {
                          toast("Copied");
                          // m10 share referral
                          setMissions((prev) =>
                            prev.map((m) => (m.id === "m10" ? { ...m, progress: 100, claimable: !m.claimed } : m))
                          );
                        });
                      }
                    }}
                    disabled={!address}
                  >
                    Copy link
                  </Button>
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
              <p className="text-xs text-slate-500">Leaderboard is calculated from the total <b>Deposit</b> on-chain (USDT) + Your personal bonus points. The top 100 are displayed.</p>
            </section>
          )}

          <footer className="py-6 text-center text-xs text-slate-500">
            By More Finance - For Kaia Wave Stablecoin Summer Hackathon
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
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">LET YOUR USDT DO THE HEAVY LIFTING.</h1>
        </div>
       <Pill tone="emerald"></Pill> 
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
  if (points >= 2000) return "Diamond";
  if (points >= 1000) return "Gold";
  if (points >= 500) return "Silver";
  return "Bronze";
}
function nextTierTarget(points: number) {
  if (points < 500) return 500;
  if (points < 1000) return 1000;
  if (points < 2000) return 2000;
  return 2000;
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

/* === RING / COMMUNITY === */
function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
      <div className="h-2 bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}
function Ring({ label, value, unit }: { label: string; value: number; unit?: string }) {
  // static ring + angka
  return (
    <div className="relative h-28 w-28">
      <div className="absolute inset-0 rounded-full border-[10px] border-emerald-200" />
      <div className="absolute inset-0 rounded-full border-[10px] border-emerald-500 border-t-transparent animate-spin" />
      <div className="absolute inset-4 rounded-full bg-white grid place-items-center">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
          <div className="text-sm font-semibold">{fmt(value, 2)}{unit ? "" : ""}</div>
        </div>
      </div>
    </div>
  );
}

/* === PROFILE RING CARD === */
function AnimatedBalance({
  label, value, sub, daily, monthly,
}: {
  label: string; value: number; sub?: string; daily: number; monthly: number;
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-4 flex items-center gap-5">
        <div className="relative h-28 w-28">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          <div className="absolute inset-2 rounded-full bg-white grid place-items-center">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">USDT</div>
              <div className="text-sm font-semibold">{fmt(value, 2)}</div>
            </div>
          </div>
        </div>
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
        <div className="mt-2 text-xs text-slate-500">{Math.floor(progress)}%</div>
      </div>
      <div className="mt-3">
        {claimed ? <Button subtle disabled>Claimed</Button> : claimable ? <Button onClick={onClaim}>Claim</Button> : <Button subtle disabled>In Progress</Button>}
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
