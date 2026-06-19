'use client';

import React, { useEffect, useState } from 'react';
import { useConfirmStore } from '@/lib/stores/confirmStore';

// Global confirmation modal, mounted once in the admin layout. Driven by
// useConfirmStore — see lib/stores/confirmStore.ts and confirmDialog().
export const ConfirmModal: React.FC = () => {
  const { open, options, resolve } = useConfirmStore();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) setValue(options?.input?.defaultValue ?? '');
  }, [open, options]);

  if (!open || !options) return null;

  const needsInput = !!options.input;
  const inputInvalid = needsInput && options.input?.required && !value.trim();

  const onConfirm = () => {
    if (inputInvalid) return;
    resolve(needsInput ? value.trim() : '');
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && resolve(null)}
    >
      <div className="w-full max-w-md bg-[#18181b] border border-[#A1A1A120] rounded-xl p-5">
        <h3 className="text-[#F9F9F9] text-lg font-bold mb-1">{options.title}</h3>
        {options.message && <p className="text-[#FFFFFF60] text-sm mb-4">{options.message}</p>}

        {needsInput && (
          <div className="mb-4">
            {options.input?.label && (
              <label className="text-[#F9F9F9] text-sm font-medium mb-1 block">{options.input.label}</label>
            )}
            {options.input?.multiline ? (
              <textarea
                autoFocus
                rows={3}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={options.input?.placeholder}
                className="w-full bg-[#09090b] border border-[#A1A1A120] rounded-lg px-3 py-2 text-sm text-[#F9F9F9] placeholder-[#FFFFFF40] focus:outline-none focus:border-[#A1A1A140] resize-none"
              />
            ) : (
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
                placeholder={options.input?.placeholder}
                className="w-full bg-[#09090b] border border-[#A1A1A120] rounded-lg px-3 py-2 text-sm text-[#F9F9F9] placeholder-[#FFFFFF40] focus:outline-none focus:border-[#A1A1A140]"
              />
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => resolve(null)}
            className="flex-1 bg-transparent border border-[#A1A1A120] text-[#F9F9F9] py-2.5 rounded-lg hover:bg-[#252528] transition-colors text-sm cursor-pointer"
          >
            {options.cancelLabel || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            disabled={inputInvalid}
            className={`flex-1 text-white py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
              options.danger ? 'bg-red-500/80 hover:bg-red-500' : 'bg-[#007acc70] hover:bg-[#007acc]'
            }`}
          >
            {options.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
