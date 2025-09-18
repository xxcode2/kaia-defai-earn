// lib/wagmiChains.ts
import { defineChain } from 'viem';
export const kaiaKairos = defineChain({
  id: 1001,
  name: 'Kaia Kairos',
  nativeCurrency: { name: 'KAIA', symbol: 'KAIA', decimals: 18 },
  rpcUrls: { default: { http: ['https://public-en-kairos.node.kaia.io'] } },
});
