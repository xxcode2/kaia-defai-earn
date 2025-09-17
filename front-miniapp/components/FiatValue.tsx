// components/FiatValue.tsx
'use client';
import { useEffect, useState } from 'react';
import { getUsdIdr } from '@/lib/prices';

export default function FiatValue({ usdt }: { usdt: number }) {
  const [idr, setIdr] = useState<number | null>(null);
  useEffect(() => { getUsdIdr().then(setIdr); }, []);
  if (idr == null) return <span className="text-gray-400 text-sm">…</span>;
  const v = Math.round(usdt * idr).toLocaleString('id-ID');
  return <span className="text-gray-500 text-sm">≈ Rp {v}</span>;
}
