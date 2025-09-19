// components/OpenExternal.ts
export function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}
export function isAndroid() {
  if (typeof navigator === 'undefined') return false
  return /Android/.test(navigator.userAgent)
}
export function isInAppWebView() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  // deteksi umum LINE/Telegram/FB/IG webview
  return /line|liff|fb_iab|instagram|telegram/.test(ua)
}

export function openExternalBrowser(url?: string) {
  url = url || window.location.href

  try {
    if (isAndroid()) {
      const intent = `intent://${url.replace(/^https?:\/\//, '')}#Intent;package=com.android.chrome;scheme=https;end`
      window.location.href = intent
      // fallback
      setTimeout(() => window.open(url!, '_blank', 'noopener,noreferrer'), 400)
      return
    }

    if (isIOS() && url.startsWith('https://')) {
      const chromeUrl = `googlechrome://${url.slice('https://'.length)}`
      const t = Date.now()
      window.location.href = chromeUrl
      setTimeout(() => {
        if (Date.now() - t < 1200) window.open(url!, '_blank', 'noopener,noreferrer')
      }, 800)
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  } catch {
    window.location.href = url
  }
}

export async function copyCurrentUrl() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    alert('Link disalin. Buka di Chrome/Safari lalu tekan Connect.')
  } catch {
    const ta = document.createElement('textarea')
    ta.value = window.location.href
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    alert('Link disalin. Buka di Chrome/Safari lalu tekan Connect.')
  }
}
