// lib/chains.ts
import type { Chain } from 'viem';

export const kaiaKairos: Chain = {
  id: 1001,
  name: 'Kaia Kairos',
  nativeCurrency: { name: 'KAIA', symbol: 'KAIA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://public-en-kairos.node.kaia.io'] },
    public: { http: ['https://public-en-kairos.node.kaia.io'] }
  },
  blockExplorers: {
    default: { name: 'Scope', url: 'https://kairos.scope.kaia.io' }
  },
  testnet: true
};

export const kaiaMainnet: Chain = {
  id: 8217,
  name: 'Kaia',
  nativeCurrency: { name: 'KAIA', symbol: 'KAIA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://public-en.node.kaia.io'] },
    public: { http: ['https://public-en.node.kaia.io'] }
  },
  blockExplorers: {
    default: { name: 'Scope', url: 'https://scope.kaia.io' }
  }
};
