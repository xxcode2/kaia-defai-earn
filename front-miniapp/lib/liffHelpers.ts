// lib/liffHelpers.ts
'use client';

export function isInLiff(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.host;
  const ua = navigator.userAgent || '';
  return host.includes('liff.line.me') || /Line/i.test(ua);
}

export function openExternalBrowser(url?: string) {
  if (typeof window === 'undefined') return;
  const target = url || window.location.href;

  // Jika liff SDK tersedia, gunakan openWindow external
  const anyWin = window as any;
  const liff = anyWin?.liff;
  if (liff?.openWindow) {
    try {
      liff.openWindow({ url: target, external: true });
      return;
    } catch {}
  }

  // Fallback: pakai window.open
  window.open(target, '_blank');
}
