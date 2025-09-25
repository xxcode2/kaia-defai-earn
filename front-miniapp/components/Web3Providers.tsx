'use client';

import { ReactNode, useMemo } from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { injected, walletConnect } from 'wagmi/connectors'
import { kaiaKairos, baseSepolia } from '@/lib/chains'

const queryClient = new QueryClient()

// Pilih chain lewat env (comma separated id), default: Kairos + Base Sepolia
// Contoh: NEXT_PUBLIC_CHAINS=1001,84532
const envIds = (process.env.NEXT_PUBLIC_CHAINS || '1001,84532')
  .split(',')
  .map(s => Number(s.trim()))
  .filter(Boolean)

const allChains = [kaiaKairos, baseSepolia] as const
const chains = allChains.filter(c => envIds.includes(c.id))

const APP_URL  = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'MORE Earn'
const APP_DESC = process.env.NEXT_PUBLIC_APP_DESC || 'Stable yield + Swap (multi-chain)'
const WC_PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim()

const metadata = {
  name: APP_NAME.replaceAll?.('"','') ?? APP_NAME,
  description: APP_DESC.replaceAll?.('"','') ?? APP_DESC,
  url: APP_URL,
  icons: [`${APP_URL}/brand/more.png`]
}

export const wagmiConfig = createConfig({
  chains,
  transports: Object.fromEntries(
    chains.map((c) => [c.id, http(c.rpcUrls.default.http[0])])
  ),
  connectors: [
    injected({ shimDisconnect: true }),
    ...(WC_PROJECT_ID ? [walletConnect({ projectId: WC_PROJECT_ID, metadata })] : [])
  ],
  ssr: false
})

export default function Web3Providers({ children }: { children: ReactNode }) {
  const tree = useMemo(() => (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  ), [children])

  return tree
}
