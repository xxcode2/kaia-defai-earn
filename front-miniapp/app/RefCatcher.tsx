"use client";

import { useEffect } from "react";

export default function RefCatcher() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    if (ref && /^0x[a-fA-F0-9]{40}$/.test(ref)) {
      // simpan untuk dipakai saat submitFirstDeposit
      localStorage.setItem("defai_ref", ref.toLowerCase());
    }
  }, []);
  return null;
}
