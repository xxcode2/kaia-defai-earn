// front-miniapp/lib/chains.ts
import { defineChain } from 'viem'

// Kairos (Kaia testnet)
export const kaiaKairos = defineChain({
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
})

// Kaia mainnet (kalau nanti perlu)
export const kaiaMainnet = defineChain({
  id: 8217,
  name: 'Kaia',
  nativeCurrency: { name: 'KAIA', symbol: 'KAIA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://public-en.node.kaia.io'] },
    public:  { http: ['https://public-en.node.kaia.io'] }
  },
  blockExplorers: {
    default: { name: 'Scope', url: 'https://scope.kaia.io' }
  },
  testnet: false
})

// Alias “kairos” supaya import { kairos } valid
export const kairos = kaiaKairos
