"use client";
import { useEffect, useMemo, useState } from "react";
import { connectWallet, getState } from "../../lib/contract";

export default function ProfilePage(){
  const [addr,setAddr]=useState("–"); const short = useMemo(()=>addr==="–"?"–":`${addr.slice(0,6)}…${addr.slice(-4)}`,[addr]);
  const [refUrl,setRefUrl]=useState("");

  async function load(){ const s = await getState(); setAddr(s.address); setRefUrl(`${location.origin}/?ref=${s.address}`); }
  useEffect(()=>{ load().catch(()=>{}); },[]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Profile</h2>
        <button className="btn btn-primary" onClick={async()=>{await connectWallet();await load();}}>{addr==="–"?"Connect":"Refresh"}</button>
      </div>
      <div className="card p-5">
        <div className="label">Address</div>
        <div className="text-xl font-semibold">{short}</div>
        <div className="label mt-4">Referral link</div>
        <div className="mt-2 flex gap-2">
          <input className="input" value={refUrl} readOnly />
          <button className="btn" onClick={()=>{navigator.clipboard.writeText(refUrl)}}>Copy</button>
        </div>
        <p className="label mt-2">Bagikan link ini di LINE untuk mengajak teman deposit.</p>
      </div>
    </main>
  );
}
