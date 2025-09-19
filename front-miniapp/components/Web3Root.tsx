// components/Web3Root.tsx
'use client'

import { WagmiProvider, createConfig, http } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { kairos } from '@/lib/chains' // sudah kamu punya
import { useEffect } from 'react'

const PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || '').trim()
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://more-earn.vercel.app'
const metadata = {
  name: (process.env.NEXT_PUBLIC_APP_NAME || 'MORE Earn').replaceAll?.('"','') || 'MORE Earn',
  description: (process.env.NEXT_PUBLIC_APP_DESC || 'Kaia Earn').replaceAll?.('"','') || 'Kaia Earn',
  url: appUrl,
  icons: [`${appUrl}/brand/more.png`],
}

export const wagmiConfig = createConfig({
  chains: [kairos],
  transports: { [kairos.id]: http(kairos.rpcUrls.default.http[0]) },
  ssr: false,
})

const queryClient = new QueryClient()

export default function Web3Root({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!PROJECT_ID) {
      console.warn('NEXT_PUBLIC_WC_PROJECT_ID kosong')
      return
    }
    if ((window as any).__W3M_INITIALIZED__) return

    const modal = createWeb3Modal({
      wagmiConfig,
      projectId: PROJECT_ID,
      themeMode: 'dark',
      metadata,
    })
    ;(window as any).__W3M_INITIALIZED__ = true
    ;(window as any).__W3M_OPEN__ = (opts?: any) => modal.open(opts)
    ;(window as any).__W3M_CLOSE__ = () => modal.close()
  }, [])

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
