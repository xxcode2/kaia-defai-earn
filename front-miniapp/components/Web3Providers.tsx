'use client'

import { PropsWithChildren, useEffect, useMemo } from 'react'
import { WagmiConfig, createConfig, http } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWeb3Modal } from '@web3modal/wagmi/react'

import { kairos, kaia } from '@/lib/chains'

const WC_PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim()
const ENV_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1001)

const CHAIN = ENV_CHAIN_ID === 8217 ? kaia : kairos
const CHAINS = [CHAIN]

const queryClient = new QueryClient()

const wagmiConfig = createConfig({
  chains: CHAINS,
  transports: {
    [CHAIN.id]: http(CHAIN.rpcUrls.default.http[0])
  },
  multiInjectedProviderDiscovery: false, // biar gak “nyari2” extension
  ssr: true
})

export default function Web3Providers({ children }: PropsWithChildren) {
  useEffect(() => {
    if (!WC_PROJECT_ID) {
      console.warn('Missing NEXT_PUBLIC_WC_PROJECT_ID. WalletConnect modal will not work.')
      return
    }
    // Init Web3Modal (WalletConnect)
    createWeb3Modal({
      wagmiConfig,
      projectId: WC_PROJECT_ID,
      chains: CHAINS,
      // Optional UI tweaks
      enableAnalytics: false,
      themeMode: 'light',
    })
  }, [])

  const Providers = useMemo(
    () => (
      <QueryClientProvider client={queryClient}>
        <WagmiConfig config={wagmiConfig}>{children}</WagmiConfig>
      </QueryClientProvider>
    ),
    [children]
  )

  return Providers
}
