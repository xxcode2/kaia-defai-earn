// front-miniapp/lib/chains.ts
import { defineChain } from 'viem'

// Kaia testnet (Kairos)
export const kaiaKairos = defineChain({
  id: 1001,
  name: 'Kaia Kairos',
  network: 'kaia-kairos',
  nativeCurrency: { name: 'KAIA', symbol: 'KAIA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://public-en-kairos.node.kaia.io'] },
    public: { http: ['https://public-en-kairos.node.kaia.io'] }
  },
  blockExplorers: { default: { name: 'Scope', url: 'https://kairos.scope.kaia.io' } },
  testnet: true
})

// Kaia mainnet
export const kaiaMainnet = defineChain({
  id: 8217,
  name: 'Kaia Mainnet',
  network: 'kaia',
  nativeCurrency: { name: 'KAIA', symbol: 'KAIA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://public-en.node.kaia.io'] },
    public: { http: ['https://public-en.node.kaia.io'] }
  },
  blockExplorers: { default: { name: 'Scope', url: 'https://scope.kaia.io' } },
  testnet: false
})

// aliases for previous import names used in project
export const kairos = kaiaKairos
export const kaia = kaiaMainnet
