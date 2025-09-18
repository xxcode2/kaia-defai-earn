// lib/chains.ts
import { type Chain } from 'wagmi/chains'

export const kairos: Chain = {
  id: 1001,
  name: 'Kaia Kairos',
  nativeCurrency: { name: 'KAIA', symbol: 'KAIA', decimals: 18 },
  rpcUrls: {
   default: { http: [process.env.NEXT_PUBLIC_RPC || 'https://public-en-kairos.node.kaia.io'] },
    public: { http: [process.env.NEXT_PUBLIC_RPC || 'https://public-en-kairos.node.kaia.io'] },
  },
  blockExplorers: {
    default: { name: 'Scope', url: 'https://kairos.scope.kaia.io' }
  },
  testnet: true
}

export const kaia: Chain = {
  id: 8217,
  name: 'Kaia',
  nativeCurrency: { name: 'Kaia', symbol: 'KAI', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://public-en.node.kaia.io'] },
    public: { http: ['https://public-en.node.kaia.io'] },
  },
  blockExplorers: {
    default: { name: 'Scope', url: 'https://scope.kaia.io' }
  },
  testnet: false
}
