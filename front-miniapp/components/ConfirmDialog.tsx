'use client';

import { useState, useCallback } from 'react';

type State = { msg: string; title?: string; resolve?: (v: boolean)=>void } | null;

export function useConfirm() {
  const [state, setState] = useState<State>(null);

  const confirm = useCallback((msg: string, title = 'Please confirm') => {
    return new Promise<boolean>((resolve) => {
      setState({ msg, title, resolve });
    });
  }, []);

  const Dialog = state ? (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm grid place-items-center">
      <div className="w-[460px] max-w-[92vw] rounded-2xl bg-white shadow-2xl border border-black/5">
        <div className="px-5 pt-4 pb-2">
          <h3 className="text-lg font-semibold">{state.title}</h3>
        </div>
        <div className="px-5 pb-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
{state.msg}
        </div>
        <div className="px-5 pb-4 flex justify-end gap-2">
          <button
            className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            onClick={() => { state.resolve?.(false); setState(null); }}
          >
            Cancel
          </button>
          <button
            className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => { state.resolve?.(true); setState(null); }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, Dialog };
}
