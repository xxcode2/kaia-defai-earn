"use client";
import { useEffect, useMemo, useState } from "react";
import { connectWallet, getState, depositUSDT, withdrawAmount } from "../lib/contract";
import Toast from "../components/Toast";
import Stat from "../components/Stat";

export default function Page() {
  const [addr, setAddr] = useState<string>("–");
  const [walletUSDT, setWalletUSDT] = useState<number>(0);
  const [tvl, setTvl] = useState<number>(0);
  const [depositVal, setDepositVal] = useState<string>("100");
  const [withdrawVal, setWithdrawVal] = useState<string>("200");
  const [busy, setBusy] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; type: "info"|"success"|"error"; msg: string }>({ show: false, type: "info", msg: "" });

  const short = useMemo(() => addr === "–" ? "–" : `${addr.slice(0, 6)}…${addr.slice(-4)}`, [addr]);

  async function refresh(silent=false) {
    try {
      const s = await getState();
      setAddr(s.address);
      setWalletUSDT(s.walletUSDT);
      setTvl(s.totalAssets);
      if (!silent) setToast({ show: true, type: "success", msg: "Refreshed" });
    } catch (e:any) {
      if (!silent) setToast({ show: true, type: "error", msg: e?.message || "Please connect wallet" });
    }
  }

  useEffect(() => { refresh(true).catch(()=>{}); const t = setInterval(()=>refresh(true), 10000); return ()=>clearInterval(t); }, []);

  async function onConnect() {
    setBusy(true);
    try { const a = await connectWallet(); setAddr(a); await refresh(true); setToast({ show: true, type: "success", msg: "Wallet connected" }); }
    catch (e:any) { setToast({ show: true, type: "error", msg: e?.message || "Connect failed" }); }
    finally { setBusy(false); }
  }

  async function onDeposit() {
    setBusy(true);
    try { await depositUSDT(depositVal || "0"); await refresh(true); setToast({ show: true, type: "success", msg: `Deposited ${depositVal} USDT` }); }
    catch (e:any) { setToast({ show: true, type: "error", msg: e?.message || "Deposit failed" }); }
    finally { setBusy(false); }
  }

  async function onWithdraw() {
    setBusy(true);
    try { await withdrawAmount(withdrawVal || "0"); await refresh(true); setToast({ show: true, type: "success", msg: `Withdrew ${withdrawVal} USDT` }); }
    catch (e:any) { setToast({ show: true, type: "error", msg: e?.message || "Withdraw failed" }); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#f9fbfa,transparent)]">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-extrabold">
            DeFAI <span className="text-kaia-600">Earn</span> — Kaia USDT
          </h1>
          <button onClick={onConnect} disabled={busy} className="btn btn-primary">
            {addr === "–" ? "Connect Wallet" : short}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 grid gap-6">
        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Wallet USDT" value={`${walletUSDT.toFixed(2)} USDT`} />
          <Stat label="Vault TVL" value={`${tvl.toFixed(2)} USDT`} />
          <Stat label="Network" value="Kairos (1001)" />
        </section>

        {/* Actions */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="text-lg font-semibold">Deposit</div>
            <div className="label mt-2">Amount (USDT)</div>
            <div className="mt-2 flex gap-2">
              <input className="input" inputMode="decimal" value={depositVal}
                     onChange={(e)=>setDepositVal(e.target.value)} placeholder="100" />
              <button onClick={()=>setDepositVal(String(Math.floor(walletUSDT)))} className="btn">Max</button>
            </div>
            <button onClick={onDeposit} disabled={busy} className="btn btn-primary mt-3 w-full">
              {busy ? "Processing…" : "Deposit"}
            </button>
            <p className="label mt-3">* Akan melakukan approve bila diperlukan.</p>
          </div>

          <div className="card p-6">
            <div className="text-lg font-semibold">Withdraw</div>
            <div className="label mt-2">Amount (USDT)</div>
            <div className="mt-2 flex gap-2">
              <input className="input" inputMode="decimal" value={withdrawVal}
                     onChange={(e)=>setWithdrawVal(e.target.value)} placeholder="200" />
              <div className="flex gap-2">
                <button className="btn" onClick={()=>setWithdrawVal("50")}>50</button>
                <button className="btn" onClick={()=>setWithdrawVal("100")}>100</button>
                <button className="btn" onClick={()=>setWithdrawVal("200")}>200</button>
              </div>
            </div>
            <button onClick={onWithdraw} disabled={busy} className="btn w-full mt-3">
              {busy ? "Processing…" : "Withdraw"}
            </button>
            <p className="label mt-3">* Withdraw by amount → dikonversi ke shares otomatis.</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 py-6">
          Built for <b>Kaia Wave Stablecoin Summer Hackathon</b>
        </footer>
      </main>

      <Toast show={toast.show} type={toast.type} message={toast.msg} onClose={()=>setToast(s=>({ ...s, show:false }))} />
    </div>
  );
}
