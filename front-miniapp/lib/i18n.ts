// lib/i18n.ts
'use client';

import en from '@/i18n/en.json';
import ja from '@/i18n/ja.json';

type Dict = Record<string, string>;
const DICTS: Record<string, Dict> = { en, ja };

let _locale = 'en';

export function detectLocale(): 'en' | 'ja' {
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language?.toLowerCase() || 'en';
    if (lang.startsWith('ja')) return 'ja';
  }
  return 'en';
}

export function initLocale() {
  _locale = detectLocale();
}

export function setLocale(lc: 'en' | 'ja') {
  _locale = lc;
}

export function getLocale() {
  return _locale;
}

export function t(key: string, vars?: Record<string, string | number>) {
  const dict = DICTS[_locale] || en;
  let s = (dict as Record<string, string>)[key] || (en as Record<string, string>)[key] || key;
  if (vars) {
    for (const k of Object.keys(vars)) {
      s = s.replace(new RegExp(`{${k}}`, 'g'), String(vars[k]));
    }
  }
  return s;
}
