export function isLiffEnv() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Line/i.test(ua); // basic check LIFF in-app browser
}
