// lib/w3m.ts
'use client';

import { isInLiff, openExternalBrowser } from './liffHelpers';

export async function openWalletModal() {
  const open = (window as any).__W3M_OPEN__;
  if (typeof open === 'function') {
    await open({ view: 'Connect' });
  } else {
    console.warn('Web3Modal belum siap di window.__W3M_OPEN__');
  }

  // Jika di LIFF & belum tersambung setelah beberapa detik, tawarkan buka external browser
  setTimeout(() => {
    const hasAddr = !!localStorage.getItem('moreearn.lastAddress');
    if (isInLiff() && !hasAddr) {
      const go = window.confirm(
        'WalletConnect mungkin diblok oleh WebView LINE.\nBuka di browser eksternal agar bisa connect?'
      );
      if (go) openExternalBrowser();
    }
  }, 2000);
}
