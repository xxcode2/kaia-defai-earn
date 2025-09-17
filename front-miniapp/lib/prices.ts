let cache: { t: number; usdIdr: number } | null = null;

/** sementara mock: ganti endpoint ke Kaia Open API / CMC saat prod */
export async function getUsdIdr(): Promise<number> {
  const now = Date.now();
  if (cache && now - cache.t < 10 * 60 * 1000) return cache.usdIdr;
  // TODO: fetch sungguhan. sementara hardcode agar UI jalan.
  const usdIdr = 15500;
  cache = { t: now, usdIdr };
  return usdIdr;
}
