'use client'

import React, { useEffect } from 'react'
import liff from '@line/liff'

type Props = {
  children: React.ReactNode
}

function LiffProvider({ children }: Props) {
  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID

    if (!liffId) {
      console.warn('⚠️ NEXT_PUBLIC_LIFF_ID belum diset di .env.local')
      return
    }

    // init LIFF SDK sekali di client
    liff
      .init({ liffId })
      .then(() => {
        if (!liff.isLoggedIn()) {
          liff.login()
        }
      })
      .catch((err) => {
        console.error('LIFF init error:', err)
      })
  }, [])

  return <>{children}</>
}

export default LiffProvider
