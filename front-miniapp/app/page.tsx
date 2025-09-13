"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";
import usdtJson from "@/lib/abi/USDT.json";
import vaultJson from "@/lib/abi/DefaiVault.json";

/* ================== ENV ================== */
const VAULT = process.env.NEXT_PUBLIC_VAULT!;
const USDT  = process.env.NEXT_PUBLIC_USDT!;
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "1001");
const APY_PCT  = Number(process.env.NEXT_PUBLIC_APY || "5"); // % per tahun
const SCOPE    = (process.env.NEXT_PUBLIC_SCOPE || "https://kairos.scope.kaia.io").replace(/\/+$/,"");

/* ================== UTIL ================== */
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
  try { return await c[fn](...args); } catch { return null; }
}
function short(addr?: string, left=6, right=4) {
  if (!addr) return "—";
  return `${addr.slice(0,left)}…${addr.slice(-right)}`;
}

/* ================== PAGE ================== */
type TabKey = "earn" | "missions" | "activity" | "profile" | "leaderboard";

export default function Page() {
  /* Tabs (sinkron hash) */
  const [tab, setTab] = useState<TabKey>("earn");
  useEffect(() => {
    const initial = (location.hash.replace("#", "") as TabKey) || "earn";
    if (["earn","missions","activity","profile","leaderboard"].includes(initial)) setTab(initial);
    const onHash = () => {
      const t = (location.hash.replace("#", "") as TabKey) || "earn";
      if (["earn","missions","activity","profile","leaderboard"].includes(t)) setTab(t);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const changeTab = (t: TabKey) => { setTab(t); location.hash = t; };

  /* State utama */
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [assetDecimals, setAssetDecimals] = useState<number>(6);

  const [walletUSDT, setWalletUSDT] = useState<number>(0);
  const [vaultTVL, setVaultTVL] = useState<number>(0);
  const [userAssets, setUserAssets] = useState<number>(0);
  const [daily, setDaily] = useState<number>(0);
  const [monthly, setMonthly] = useState<number>(0);

  const [depAmt, setDepAmt] = useState("100");
  const [wdAmt, setWdAmt] = useState("50");

  const [activity] = useState<Array<{type: "Deposit" | "Withdraw"; amount: number; hash: string; block?: number}>>([
    { type: "Deposit",  amount: 100, hash: "0xabc...1" },
    { type: "Withdraw", amount: 50,  hash: "0xabc...2" },
    { type: "Deposit",  amount: 200, hash: "0xabc...3" },
  ]);

  const [missions, setMissions] = useState([
    { id: "m1", title: "Connect Wallet",     pts: 50,  progress: 100, claimable: true,  claimed: false },
    { id: "m2", title: "Deposit ≥ 50 USDT",  pts: 150, progress: 50,  claimable: false, claimed: false },
    { id: "m3", title: "Try Withdraw",       pts: 100, progress: 0,   claimable: false, claimed: false },
  ]);

  const points = useMemo(() => {
    const base = 120;
    const bonus = missions.filter(m => m.claimed).reduce((s,m)=> s + m.pts, 0);
    return base + bonus;
  }, [missions]);

  const leaders = useMemo(() => ([
    { addr: "0x7a1...12e", pts: 880 },
    { addr: "0x51b...af3", pts: 760 },
    { addr: "0x2cd...9e0", pts: 540 },
    { addr: "you",         pts:  points },
  ]), [points]);

  const USER_ASSET_GETTERS = [
    "assetsOf","getAssets","getAsset","getBalance","getUserBalance",
    "userBalance","userAsset","userAssets","principalOf","deposits","balances",
    "balanceOf"
  ];

  const refresh = useCallback(async () => {
    try {
      const { provider, signer } = await getProviderAndSigner();
      const me = await signer.getAddress();
      setAddress(me);

      const usdtRead  : any = new Contract(USDT,  usdtJson.abi,  provider);
      const vaultRead : any = new Contract(VAULT, vaultJson.abi, provider);

      const aDec = Number((await tryCall(usdtRead, "decimals")) ?? 6);
      setAssetDecimals(aDec);

      const wBal = await tryCall(usdtRead, "balanceOf", me);
      setWalletUSDT(Number(formatUnits(wBal ?? 0n, aDec)));

      const tvlBal = await tryCall(usdtRead, "balanceOf", VAULT);
      setVaultTVL(Number(formatUnits(tvlBal ?? 0n, aDec)));

      let assetsRaw: bigint | null = null;
      for (const fn of USER_ASSET_GETTERS) {
        const r = await tryCall(vaultRead, fn, me);
        if (r && typeof r === "bigint") { assetsRaw = r; break; }
      }
      if (!assetsRaw) {
        const info = await tryCall(vaultRead, "userInfo", me);
        if (info) {
          const arr = Array.isArray(info) ? info : [];
          const bigs = arr.filter((x:any)=> typeof x === "bigint") as bigint[];
          if (bigs.length) assetsRaw = bigs.sort((a,b)=> (a>b? -1: 1))[0];
        }
      }

      const assetsNum = Number(formatUnits(assetsRaw ?? 0n, aDec));
      setUserAssets(assetsNum);

      const apy = APY_PCT / 100;
      setDaily((assetsNum * apy) / 365);
      setMonthly((assetsNum * apy) / 12);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  /* Actions */
  async function onDeposit() {
    try {
      setLoading(true);
      const { signer } = await getProviderAndSigner();
      const usdt : any = new Contract(USDT,  usdtJson.abi,  signer);
      const vault: any = new Contract(VAULT, vaultJson.abi, signer);
      const me = await signer.getAddress();

      const assets = parseUnits(depAmt || "0", assetDecimals);
      const allowance: bigint = await usdt.allowance(me, VAULT);
      if (allowance < assets) {
        const txA = await usdt.approve(VAULT, assets);
        toast("Approving USDT…");
        await txA.wait();
      }
      const tx =
        (await tryCall(vault, "deposit", assets)) ||
        (await tryCall(vault, "stake", assets))   ||
        (await tryCall(vault, "depositAssets", assets));
      if (!tx) throw new Error("Deposit method tidak ditemukan di Vault.");

      toast("Depositing…");
      await tx.wait();
      toast("Deposit success ✅");
      setTimeout(() => refresh(), 1000);

      setMissions(ms => ms.map(m => m.id === "m2" ? { ...m, progress: 100, claimable: true } : m));
    } catch (e:any) {
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

      const assets = parseUnits(wdAmt || "0", assetDecimals);
      const tx =
        (await tryCall(vault, "withdraw", assets)) ||
        (await tryCall(vault, "withdrawAssets", assets)) ||
        (await tryCall(vault, "withdrawUSDT",  assets)) ||
        (await tryCall(vault, "unstake",       assets)) ||
        (await tryCall(vault, "claim",         assets));
      if (!tx) throw new Error("Withdraw method (assets) tidak ditemukan di Vault.");

      toast("Withdrawing…");
      await tx.wait();
      toast("Withdraw success ✅");
      setTimeout(() => refresh(), 1000);

      setMissions(ms => ms.map(m => m.id === "m3" ? { ...m, progress: 100, claimable: true } : m));
    } catch (e:any) {
      console.error(e);
      alert(e?.reason || e?.message || "Withdraw gagal");
    } finally {
      setLoading(false);
    }
  }

  function onMaxDeposit() { setDepAmt(String(Math.max(0, walletUSDT))); }
  function onMaxWithdraw() { setWdAmt(Math.max(0, userAssets).toFixed(Math.min(assetDecimals, 6))); }

  /* UI */
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-slate-900">
      <div className="mx-auto max-w-7xl md:flex">
        {/* ===== RESPONSIVE SIDEBAR (no top navbar) ===== */}
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
                  DeFAI <span className="text-emerald-600">Earn</span>
                </div>
              </div>
              <span className="text-xs text-slate-500 md:hidden">{address ? short(address) : "—"}</span>
            </div>

            <div className="px-2 pb-2 md:px-4 md:pb-0">
              {/* mobile pills */}
              <div className="flex gap-1 overflow-x-auto md:hidden">
                <TabTop label="Earn"        active={tab==="earn"}        onClick={()=>changeTab("earn")} />
                <TabTop label="Missions"    active={tab==="missions"}    onClick={()=>changeTab("missions")} />
                <TabTop label="Activity"    active={tab==="activity"}    onClick={()=>changeTab("activity")} />
                <TabTop label="Profile"     active={tab==="profile"}     onClick={()=>changeTab("profile")} />
                <TabTop label="Leaderboard" active={tab==="leaderboard"} onClick={()=>changeTab("leaderboard")} />
              </div>

              {/* desktop vertical */}
              <nav className="hidden md:grid md:gap-1">
                <NavItem label="Earn"        active={tab==="earn"}        onClick={()=>changeTab("earn")} />
                <NavItem label="Missions"    active={tab==="missions"}    onClick={()=>changeTab("missions")} />
                <NavItem label="Activity"    active={tab==="activity"}    onClick={()=>changeTab("activity")} />
                <NavItem label="Profile"     active={tab==="profile"}     onClick={()=>changeTab("profile")} />
                <NavItem label="Leaderboard" active={tab==="leaderboard"} onClick={()=>changeTab("leaderboard")} />
              </nav>

              {/* desktop footer address */}
              <div className="hidden md:block mt-auto text-xs text-slate-500 px-1 pt-4">
                {address ? (
                  <div className="flex items-center gap-2">
                    <Avatar address={address} />
                    <span className="truncate">{short(address)}</span>
                  </div>
                ) : (
                  <span>Not connected</span>
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
              <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Wallet USDT" value={`${fmt(walletUSDT)} USDT`} />
                <StatCard label="Vault TVL" value={`${fmt(vaultTVL)} USDT`} />
                <StatCard label="APY (target)" value={`${APY_PCT}%`} />
                <StatCard label="Your shares" value={"—"} />
              </section>

              <section className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
                <div className="text-sm text-slate-500">Your earnings (est.)</div>
                <div className="mt-1 text-sm">
                  Daily: <b>{fmt(daily, 4)} USDT</b> · Monthly: <b>{fmt(monthly, 4)} USDT</b>
                </div>
              </section>

              <section className="grid md:grid-cols-2 gap-4">
                <Card title="Deposit">
                  <Input
                    value={depAmt}
                    onChange={(v) => setDepAmt(v)}
                    placeholder="0.00"
                    suffix={<Button subtle onClick={onMaxDeposit}>Max</Button>}
                  />
                  <Button className="mt-3" size="lg" onClick={onDeposit} disabled={loading}>
                    {loading ? "Processing…" : "Deposit"}
                  </Button>
                  <p className="text-xs text-slate-500 mt-2">* Akan melakukan approve bila diperlukan.</p>
                </Card>

                <Card title="Withdraw">
                  <Input
                    value={wdAmt}
                    onChange={(v) => setWdAmt(v)}
                    placeholder="0.00"
                    suffix={<Button subtle onClick={onMaxWithdraw}>Max</Button>}
                  />
                  <Button className="mt-3" size="lg" tone="dark" onClick={onWithdraw} disabled={loading}>
                    {loading ? "Processing…" : "Withdraw"}
                  </Button>
                  <p className="text-xs text-slate-500 mt-2">
                    * Withdraw memanggil fungsi berbasis <b>assets (USDT)</b> secara langsung.
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
                      setMissions((prev) => prev.map(x => x.id === m.id ? { ...x, claimable: false, claimed: true } : x));
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
              <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white/70 backdrop-blur">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <Th>Type</Th>
                      <Th right>Amount (USDT)</Th>
                      <Th>Tx</Th>
                    </tr>
                  </thead>
                  <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-black/5">
                    {activity.map((row, i) => (
                      <Tr key={i}>
                        <Td>{row.type}</Td>
                        <Td right>{fmt(row.amount, 6)}</Td>
                        <Td>
                          <a className="text-emerald-600 hover:underline" href="#" onClick={(e)=>e.preventDefault()}>
                            {row.hash}
                          </a>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500">
                * Sambungkan ke indexer / Scope / Dune untuk data realtime.
              </p>
            </section>
          )}

          {/* PROFILE */}
          {tab === "profile" && (
            <section className="space-y-6">
              <SectionTitle>Profile</SectionTitle>

              <div className="grid lg:grid-cols-2 gap-4">
                {/* Account */}
                <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <Avatar address={address} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-500">Address</div>
                      {/* Address field with copy / external */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 min-w-0 rounded-xl border border-black/10 bg-white/70 px-3 py-2 font-mono text-xs text-slate-700 overflow-hidden">
                          <div className="truncate">{address || "—"}</div>
                        </div>
                        <IconButton
                          label="Copy"
                          onClick={() => address && navigator.clipboard?.writeText(address).then(()=>toast("Copied"))}
                          disabled={!address}
                        >
                          {/* copy icon */}
                          <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 15H8V7h11v13Z"/></svg>
                        </IconButton>
                        <IconButton
                          label="Open in Explorer"
                          onClick={() => openInExplorer(address)}
                          disabled={!address}
                        >
                          {/* external icon */}
                          <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3ZM5 5h6v2H7v10h10v-4h2v6H5V5Z"/></svg>
                        </IconButton>
                      </div>

                      <div className="mt-3 text-xs text-slate-500 break-all">
                        Vault:{" "}
                        <a className="text-emerald-600 hover:underline" onClick={(e)=>{e.preventDefault(); openInExplorer(VAULT);}} href="#">
                          {short(VAULT)}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referral */}
                <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Referral</div>
                    <Pill tone="emerald">Off-chain points</Pill>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">Share your link to earn points</div>
                  <div className="mt-2 rounded-xl border border-black/10 bg-white/60 p-3 break-all text-sm">
                    {refLink(address)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button subtle onClick={() => refLink(address) && navigator.clipboard?.writeText(refLink(address)).then(()=>toast("Copied"))} disabled={!address}>Copy link</Button>
                    <Button subtle onClick={() => shareLink(refLink(address))} disabled={!address}>Share…</Button>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-4">
                {/* Points */}
                <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500">Your Points</div>
                    <Pill tone="emerald">{tierLabel(points)} Tier</Pill>
                  </div>

                  <div className="mt-2 text-4xl font-semibold tracking-tight">{points.toLocaleString()}</div>

                  <div className="mt-3 grid sm:grid-cols-3 gap-3">
                    <SmallStat label="From Missions" value="200" />
                    <SmallStat label="From Deposits" value={(points-200).toLocaleString()} />
                    <SmallStat label="Referrals" value="0" />
                  </div>

                  <TierProgress points={points} />
                  <div className="mt-2 text-xs text-slate-500">
                    Points bersifat off-chain untuk gamifikasi.
                  </div>
                </div>

                {/* Badges */}
                <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
                  <div className="text-sm text-slate-500">Badges</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Badge className="justify-center">Early</Badge>
                    <Badge className={clsx("justify-center", points >= 200 ? "" : "opacity-50")}>Supporter</Badge>
                    <Badge className={clsx("justify-center", points >= 500 ? "" : "opacity-50")}>Whale</Badge>
                    <Badge className={clsx("justify-center", points >= 1500 ? "" : "opacity-50")}>Gold</Badge>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    More badges unlock as you earn points.
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* LEADERBOARD */}
          {tab === "leaderboard" && (
            <section className="space-y-4">
              <SectionTitle>Leaderboard</SectionTitle>
              <div className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-4 shadow-sm">
                <ol className="divide-y divide-black/5">
                  {leaders
                    .slice()
                    .sort((a,b)=> b.pts - a.pts)
                    .map((l, idx) => (
                    <li key={idx} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={clsx(
                          "w-8 h-8 rounded-full grid place-items-center text-sm font-semibold flex-none",
                          idx===0 && "bg-amber-200",
                          idx===1 && "bg-slate-200",
                          idx===2 && "bg-orange-200",
                          idx>2 && "bg-slate-100"
                        )}>{idx+1}</span>
                        <span className="text-sm truncate">
                          {l.addr === "you" ? (address ? short(address) : "You") : l.addr}
                        </span>
                      </div>
                      <div className="text-sm font-semibold">{l.pts.toLocaleString()} pts</div>
                    </li>
                  ))}
                </ol>
              </div>
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

/* ================== PRIMITIVES ================== */
function Hero() {
  return (
    <section className="rounded-3xl border border-black/5 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Grow your USDT the easy way</h1>
          <p className="text-sm md:text-base text-slate-600 mt-1">
            Simple deposits. Transparent yields. Withdraw anytime.
          </p>
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
function TabTop({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-4 py-1.5 rounded-xl text-sm font-medium transition-colors",
        active ? "bg-emerald-600 text-white shadow" : "text-slate-700 bg-white/80"
      )}
    >
      {label}
    </button>
  );
}
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs shadow-sm",
        className
      )}
    >
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
  children,
  onClick,
  size = "md",
  tone = "emerald",
  subtle = false,
  className,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  size?: "md" | "lg" | "sm";
  tone?: "emerald" | "dark";
  subtle?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const sizes = { sm: "px-2.5 py-1.5 text-sm", md: "px-3 py-2 text-sm", lg: "w-full py-3 text-base" } as const;
  const tones = {
    emerald: subtle
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
      : "bg-emerald-600 text-white hover:bg-emerald-700",
    dark: subtle
      ? "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200"
      : "bg-slate-900 text-white hover:bg-slate-800",
  } as const;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "rounded-xl font-medium shadow-sm border border-transparent active:translate-y-px transition-colors disabled:opacity-60",
        sizes[size],
        tones[tone],
        className
      )}
    >
      {children}
    </button>
  );
}
function IconButton({
  children, onClick, label, disabled
}: { children: React.ReactNode; onClick?: ()=>void; label?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      disabled={disabled}
      className={clsx(
        "h-9 w-9 grid place-items-center rounded-xl border border-black/10 bg-white/80 text-slate-700 shadow-sm",
        "hover:bg-slate-50 active:translate-y-px disabled:opacity-60"
      )}
    >
      {children}
    </button>
  );
}
function Input({
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
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
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">USDT</span>
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
  for (let i=0;i<addr.length;i++) h = (h*31 + addr.charCodeAt(i)) % 360;
  return h;
}
function Avatar({ address }: { address?: string }) {
  const hue = colorFromAddress(address);
  return (
    <div
      className="h-12 w-12 rounded-2xl shadow-inner border border-black/5 flex-none"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 80% 80%), hsl(${(hue+60)%360} 70% 70%))` }}
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
  const text = "Join me on DeFAI Earn — simple USDT yield on Kaia";
  if (navigator.share) {
    navigator.share({ title: "DeFAI Earn", text, url }).catch(()=>{});
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
  if (points >= 500)  return "Silver";
  return "Bronze";
}
function nextTierTarget(points: number) {
  if (points < 500)  return 500;
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
      <div className="mt-1 text-xs text-slate-500">
        {points.toLocaleString()} / {target.toLocaleString()} pts
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
          <div
            className="h-2 bg-emerald-500 rounded-full transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-slate-500">{progress}%</div>
      </div>
      <div className="mt-3">
        {claimed ? (
          <Button subtle disabled>Claimed</Button>
        ) : claimable ? (
          <Button onClick={onClaim}>Claim</Button>
        ) : (
          <Button subtle disabled>In Progress</Button>
        )}
      </div>
    </div>
  );
}

/* ================== MINI TOAST ================== */
function toast(text: string) {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const el = document.createElement("div");
  el.className =
    "mb-2 rounded-xl bg-slate-900 text-white/95 px-3 py-2 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2";
  el.textContent = text;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add("opacity-0", "transition-opacity");
    setTimeout(() => el.remove(), 300);
  }, 1400);
}
