'use client';

import React, { useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useStepUpStore } from '@/lib/stores/stepUpStore';
import { adminAuthApi } from '@/lib/api/auth';

// Global step-up MFA modal (P4). Mounted once in the admin layout. Shown when a
// nuclear action triggers a STEP_UP_REQUIRED response; on success it resolves the
// pending request promise so the interceptor can retry.
export const StepUpModal: React.FC = () => {
  const { open, resolve, cancel } = useStepUpStore();
  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const close = () => {
    setCode('');
    setError('');
    setUseBackup(false);
  };

  const submit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      await adminAuthApi.stepUp(code.trim());
      close();
      resolve();
    } catch {
      setError('Invalid code. Try again.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#18181b] border border-[#A1A1A120] rounded-xl p-5">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-[#007acc]/20 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[#007acc]" />
          </div>
        </div>
        <h3 className="text-[#F9F9F9] text-lg font-bold text-center mb-1">Confirm it&apos;s you</h3>
        <p className="text-[#FFFFFF60] text-[13px] text-center mb-4">
          This action requires re-entering your {useBackup ? 'backup code' : 'authenticator code'}.
        </p>

        <input
          autoFocus
          type="text"
          inputMode={useBackup ? 'text' : 'numeric'}
          value={code}
          onChange={(e) => setCode(useBackup ? e.target.value : e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={useBackup ? 'XXXX-XXXX' : '123456'}
          maxLength={useBackup ? 9 : 6}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-center tracking-[0.4em] focus:outline-none focus:border-[#A1A1A140] transition-colors mb-2"
        />
        {error && <p className="text-red-400 text-xs text-center mb-2">{error}</p>}

        <button
          onClick={submit}
          disabled={loading || !code.trim()}
          className="w-full bg-[#007acc70] text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2 cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (<><Loader2 size={16} className="animate-spin" />Verifying...</>) : 'Verify'}
        </button>

        <button
          onClick={() => { setUseBackup(!useBackup); setCode(''); setError(''); }}
          className="w-full text-[#007acc70] text-xs cursor-pointer mb-1"
        >
          {useBackup ? 'Use authenticator app instead' : 'Use a backup code'}
        </button>
        <button
          onClick={() => { close(); cancel(); }}
          className="w-full text-[#FFFFFF60] text-sm cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
