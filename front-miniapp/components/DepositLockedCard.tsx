'use client';

import { useState, useMemo } from "react";
import { ethers } from "ethers";
import { useDappPortal } from "@/components/DappPortalProvider";
import { requireProvider, getSignerAndAddress, toUnits, formatUnits, ensureKairosNetwork } from "@/lib/eth";
import { getAllowance, safeApprove } from "@/lib/erc20";
import { depositLocked } from "@/lib/vault";

const VAULT = process.env.NEXT_PUBLIC_VAULT!;
const USDT = process.env.NEXT_PUBLIC_USDT!;
const DECIMALS = Number(process.env.NEXT_PUBLIC_USDT_DECIMALS || "6"); // default 6 untuk USDT
const PRESETS = [7, 14, 30, 90, 180, 365];

export default function DepositLockedCard() {
  const { address } = useDappPortal();

  const [amountStr, setAmountStr] = useState("");
  const [lockDays, setLockDays] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "need-approve" | "ready-deposit">("idle");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const unlockDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + (lockDays || 0));
    return d;
  }, [lockDays]);

  const amountBn = useMemo(() => {
    try {
      if (!amountStr) return 0n;
      return toUnits(amountStr, DECIMALS);
    } catch {
      return 0n;
    }
  }, [amountStr]);

  async function checkAllowanceFlow() {
    setError(undefined);
    setTxHash(undefined);
    try {
      if (!address) throw new Error("Hubungkan wallet dulu.");
      if (!USDT || !VAULT) throw new Error("ENV NEXT_PUBLIC_USDT / NEXT_PUBLIC_VAULT belum diisi.");
      if (amountBn <= 0) throw new Error("Masukkan nominal > 0.");

      const provider = requireProvider();
      await ensureKairosNetwork();
      const { signer } = await getSignerAndAddress(provider);

      const allowance = await getAllowance(USDT, address, VAULT, provider);
      if (allowance < amountBn) {
        setStep("need-approve");
      } else {
        setStep("ready-deposit");
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setStep("idle");
    }
  }

  async function onApprove() {
    setLoading(true);
    setError(undefined);
    setTxHash(undefined);
    try {
      if (!address) throw new Error("Hubungkan wallet dulu.");
      const provider = requireProvider();
      await ensureKairosNetwork();
      const { signer } = await getSignerAndAddress(provider);

      await safeApprove(USDT, VAULT, amountBn, signer);
      setStep("ready-deposit");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onDeposit() {
    setLoading(true);
    setError(undefined);
    setTxHash(undefined);
    try {
      if (!address) throw new Error("Hubungkan wallet dulu.");
      if (amountBn <= 0n) throw new Error("Nominal tidak valid.");
      if (!Number.isFinite(lockDays) || lockDays <= 0) throw new Error("Durasi lock tidak valid.");

      const provider = requireProvider();
      await ensureKairosNetwork();
      const { signer } = await getSignerAndAddress(provider);

      const receipt = await depositLocked(VAULT, amountBn, lockDays, signer);
      setTxHash(receipt?.hash ?? receipt?.transactionHash);
      // reset form
      setAmountStr("");
      setLockDays(30);
      setStep("idle");
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  function onMax() {
    // (opsional) jika kamu punya endpoint / balance USDT, bisa tambahkan fetch balance di sini.
    // Untuk placeholder, biarkan manual atau tambahkan fungsi pembaca balance ERC20 jika ingin.
  }

  return (
    <div className="w-full max-w-xl mx-auto rounded-2xl border border-slate-200 p-4 sm:p-6 bg-white shadow-sm">
      <h2 className="text-lg sm:text-xl font-semibold">Deposit & Lock (USDT)</h2>

      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium">Nominal (USDT)</label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            step="0.000001"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0.00"
            className="flex-1 px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button onClick={onMax} className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50">
            Max
          </button>
        </div>

        <label className="block text-sm font-medium mt-3">Durasi Lock (hari)</label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((d) => (
            <button
              key={d}
              onClick={() => setLockDays(d)}
              className={`px-3 py-2 rounded-xl border ${
                lockDays === d ? "border-black bg-black text-white" : "border-slate-300 hover:bg-slate-50"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500">
          Unlock pada: <span className="font-medium">{unlockDate.toLocaleString()}</span>
        </div>

        <div className="mt-4">
          {/* Tombol multi-step */}
          {step === "need-approve" ? (
            <button
              disabled={loading || !address || amountBn <= 0n}
              onClick={onApprove}
              className="w-full px-4 py-3 rounded-xl bg-black text-white disabled:opacity-50"
            >
              {loading ? "Approving…" : "Approve USDT"}
            </button>
          ) : step === "ready-deposit" ? (
            <button
              disabled={loading || !address || amountBn <= 0n}
              onClick={onDeposit}
              className="w-full px-4 py-3 rounded-xl bg-black text-white disabled:opacity-50"
            >
              {loading ? "Depositing…" : "Deposit & Lock"}
            </button>
          ) : (
            <button
              disabled={loading || !address || amountBn <= 0n}
              onClick={checkAllowanceFlow}
              className="w-full px-4 py-3 rounded-xl bg-black text-white disabled:opacity-50"
            >
              {loading ? "Checking…" : "Lanjutkan"}
            </button>
          )}
        </div>

        {txHash && (
          <div className="text-xs mt-2">
            Tx:{" "}
            <a
              className="underline"
              href={`https://kairos.kaiascan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              {txHash}
            </a>
          </div>
        )}

        {error && <div className="text-xs text-red-600 mt-2">Error: {error}</div>}

        {!address && <div className="text-xs text-slate-500 mt-2">Hubungkan wallet untuk mulai deposit.</div>}
      </div>
    </div>
  );
}
