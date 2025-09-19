// lib/env.ts
export function isBrowser() {
  return typeof window !== 'undefined';
}

export function isLiffEnv(): boolean {
  if (!isBrowser()) return false;
  const h = window.location.host || '';
  return h.includes('liff.line.me'); // LIFF domain
}

export function isInAppWebView(): boolean {
  if (!isBrowser()) return false;
  const ua = navigator.userAgent || '';
  // Deteksi umum in-app webview (LINE/FB/IG/Twitter/TikTok, dsb)
  const signals = [
    'Line/', 'LIFF', 'FBAN', 'FBAV', 'Instagram', 'Twitter', 'TikTok',
    'GSA', 'wv' // Android webview
  ];
  return signals.some(s => ua.includes(s));
}

export function isIOS(): boolean {
  if (!isBrowser()) return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (!isBrowser()) return false;
  return /Android/i.test(navigator.userAgent);
}
