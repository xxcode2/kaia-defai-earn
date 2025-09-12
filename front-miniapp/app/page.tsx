"use client";
import { useEffect, useMemo, useState } from "react";
import { captureReferralFromURL, connectWallet, depositUSDT, getState, withdrawAmount } from "../lib/contract";

export default function EarnPage() {
  const [addr, setAddr] = useState<string>("–");
  const [walletUSDT, setWalletUSDT] = useState(0);
  const [tvl, setTvl] = useState(0);
  const [userAssets, setUserAssets] = useState(0);
  const [apy, setApy] = useState(0);
  const [daily, setDaily] = useState(0);
  const [monthly, setMonthly] = useState(0);
  const [dep, setDep] = useState("100");
  const [wd, setWd] = useState("200");
  const [busy, setBusy] = useState(false);
  const short = useMemo(()=> addr==="–"?"–":`${addr.slice(0,6)}…${addr.slice(-4)}`,[addr]);

  async function refresh(silent=false){
    try{
      const s = await getState();
      setAddr(s.address); setWalletUSDT(s.walletUSDT); setTvl(s.tvl);
      setUserAssets(s.userAssets); setApy(s.apy); setDaily(s.daily); setMonthly(s.monthly);
    }catch(e){ if(!silent) console.error(e); }
  }

  useEffect(()=>{ captureReferralFromURL(); refresh(true); const t=setInterval(()=>refresh(true),10000); return ()=>clearInterval(t);},[]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">DeFAI <span className="text-[#12a988]">Earn</span> — Kaia USDT</h1>
        <button className="btn btn-primary" onClick={async()=>{setBusy(true);try{await connectWallet();await refresh();}finally{setBusy(false);}}} disabled={busy}>
          {addr==="–"?"Connect Wallet":short}
        </button>
      </div>

      {/* stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5"><div className="label">Wallet USDT</div><div className="text-2xl font-semibold">{walletUSDT.toFixed(2)} USDT</div></div>
        <div className="card p-5"><div className="label">Vault TVL</div><div className="text-2xl font-semibold">{tvl.toFixed(2)} USDT</div></div>
        <div className="card p-5"><div className="label">APY</div><div className="text-2xl font-semibold">{apy.toFixed(2)}%</div></div>
      </section>

      {/* earnings */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 md:col-span-1">
          <div className="label">Your staked (est.)</div>
          <div className="text-2xl font-semibold">{userAssets.toFixed(2)} USDT</div>
          <div className="label mt-4">Projected earnings</div>
          <div className="mt-1">Daily: <b>{daily.toFixed(4)}</b> USDT</div>
          <div className="mt-1">Monthly: <b>{monthly.toFixed(2)}</b> USDT</div>
        </div>

        {/* deposit */}
        <div className="card p-5">
          <div className="text-lg font-semibold">Deposit</div>
          <div className="label mt-2">Amount (USDT)</div>
          <div className="mt-2 flex gap-2">
            <input className="input" value={dep} onChange={e=>setDep(e.target.value)} inputMode="decimal"/>
            <button className="btn" onClick={()=>setDep(String(Math.floor(walletUSDT)))}>Max</button>
          </div>
          <button className="btn btn-primary w-full mt-3" disabled={busy}
            onClick={async()=>{setBusy(true); try{await depositUSDT(dep); await refresh();} finally{setBusy(false);}}}>
            Deposit
          </button>
          <p className="label mt-2">* Akan melakukan approve bila diperlukan.</p>
        </div>

        {/* withdraw */}
        <div className="card p-5">
          <div className="text-lg font-semibold">Withdraw</div>
          <div className="label mt-2">Amount (USDT)</div>
          <div className="mt-2 flex gap-2">
            <input className="input" value={wd} onChange={e=>setWd(e.target.value)} inputMode="decimal"/>
            <div className="flex gap-2">
              <button className="btn" onClick={()=>setWd("50")}>50</button>
              <button className="btn" onClick={()=>setWd("100")}>100</button>
              <button className="btn" onClick={()=>setWd("200")}>200</button>
            </div>
          </div>
          <button className="btn w-full mt-3" disabled={busy}
            onClick={async()=>{setBusy(true); try{await withdrawAmount(wd); await refresh();} finally{setBusy(false);}}}>
            Withdraw
          </button>
          <p className="label mt-2">* Withdraw by amount → dikonversi ke shares otomatis.</p>
        </div>
      </section>
    </main>
  );
}
