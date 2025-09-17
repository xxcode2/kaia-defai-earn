'use client';

import { useEffect } from 'react';
import { initLocale } from '@/lib/i18n';

export default function InitLocale() {
  useEffect(() => {
    initLocale();
  }, []);
  return null;
}
