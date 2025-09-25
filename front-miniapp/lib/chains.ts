// lib/chains.ts
import type { Chain } from 'wagmi'

export const kaiaKairos = {
  id: 1001,
  name: 'Kaia Kairos',
  nativeCurrency: { name: 'KAIA', symbol: 'KAIA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://public-en-kairos.node.kaia.io'] },
    public:  { http: ['https://public-en-kairos.node.kaia.io'] }
  },
  blockExplorers: {
    default: { name: 'Scope', url: 'https://kairos.scope.kaia.io' }
  },
  testnet: true
} as const satisfies Chain

export const baseSepolia = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
    public:  { http: ['https://sepolia.base.org'] }
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://sepolia.basescan.org' }
  },
  testnet: true
} as const satisfies Chain
