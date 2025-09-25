'use client';

import ConnectWalletButton from '@/components/ConnectWalletButton'
import Swap from '@/components/Swap'

export default function HomePage() {
  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">MORE Earn</h1>
        <ConnectWalletButton />
      </header>

      {/* Seksi produk kamu (tampilan vault dsb) bisa tetap di sini */}

      <section>
        <h2 className="text-lg font-semibold mb-2">Swap</h2>
        <Swap />
      </section>
    </main>
  )
}
