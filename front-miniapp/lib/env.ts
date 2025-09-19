// front-miniapp/lib/env.ts
export function isLiffEnv(): boolean {
  if (typeof window === 'undefined') return false
  try {
    // LIFF url contains liff.line.me OR navigator userAgent contains Line
    const host = window.location.host || ''
    const ua = navigator.userAgent || ''
    if (host.includes('liff.line.me')) return true
    if (/Line\/|LIFF/.test(ua)) return true
    return false
  } catch {
    return false
  }
}

/** apakah kemungkinan webview yang memblok WalletConnect (LINE WebView)? */
export function isLikelyBlockedWebview(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /Line\/|LIFF|FBAN|FBAV|Instagram/.test(ua)
}
