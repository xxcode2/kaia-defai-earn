// components/PaymentPrecautions.tsx
'use client';

import { t } from '@/lib/i18n';
import clsx from 'clsx';

export default function PaymentPrecautions({
  open,
  onCancel,
  onProceed,
}: {
  open: boolean;
  onCancel: () => void;
  onProceed: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div
        className={clsx(
          'relative w-full max-w-md rounded-2xl border border-black/10',
          'bg-white shadow-xl p-5 space-y-3'
        )}
      >
        <div className="text-lg font-semibold">{t('payment_precautions_title')}</div>
        <p className="text-sm text-slate-600">{t('payment_precautions_msg')}</p>
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onProceed}
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {t('proceed')}
          </button>
        </div>
      </div>
    </div>
  );
}
