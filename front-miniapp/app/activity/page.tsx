"use client";
import { useEffect, useMemo, useState } from "react";
import { getUserActivity, type UserActivity } from "@/lib/activity";

const VAULT = process.env.NEXT_PUBLIC_VAULT!;
const FROM_BLOCK = Number(process.env.NEXT_PUBLIC_VAULT_FROM_BLOCK || "0");

type Row = {
  block: number;
  type: "Deposit" | "Withdraw";
  user: string;
  assets: number;
  shares: number;
  tx: string;
};

export default function ActivityPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getUserActivity(VAULT, FROM_BLOCK, 6);
        // map ke Row (biar type cocok)
        setRows(
          data.map((d) => ({
            block: d.blockNumber,
            type: d.type,
            user: d.user,
            assets: d.assets,
            shares: d.shares,
            tx: d.txHash,
          }))
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ... render tabel dsb
  return <div>{loading ? "Loading..." : JSON.stringify(rows.slice(0, 3), null, 2)}</div>;
}
