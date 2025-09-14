// app/activity/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { getVaultActivity, type UserActivity } from "@/lib/activity";

const VAULT = process.env.NEXT_PUBLIC_VAULT!;
const FROM_BLOCK = Number(process.env.NEXT_PUBLIC_VAULT_FROM_BLOCK || "0");

type Row = UserActivity;

export default function ActivityPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getVaultActivity(VAULT, FROM_BLOCK, 6);
        setRows(data);
        setLastUpdated(new Date().toLocaleTimeString());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ... render tabel dsb
  return <div>{loading ? "Loading..." : JSON.stringify(rows.slice(0, 3), null, 2)}</div>;
}
