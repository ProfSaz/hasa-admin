'use client';

import React from 'react';
import { useAdminModeStore, type Mode } from '@/lib/stores/modeStore';

// Admin Test/Live toggle. No approval gate (staff). Switching reloads so all
// platform data views re-fetch scoped to the new mode. Live shown loud (red).
export const ModeToggle: React.FC = () => {
  const mode = useAdminModeStore((s) => s.mode);
  const setMode = useAdminModeStore((s) => s.setMode);

  const switchTo = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setTimeout(() => window.location.reload(), 150);
  };

  const base = 'flex items-center gap-1.5 px-3 py-1 rounded-md text-[13px] font-medium transition-colors cursor-pointer';

  return (
    <div className="flex items-center bg-[#18181b] border border-[#A1A1A120] p-1 rounded-lg gap-1">
      <button
        onClick={() => switchTo('test')}
        className={`${base} ${mode === 'test' ? 'bg-black text-[#F9F9F9]' : 'text-[#FFFFFF60] hover:text-[#F9F9F9]'}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${mode === 'test' ? 'bg-[#f59e0b]' : 'bg-[#FFFFFF40]'}`} />
        Test
      </button>
      <button
        onClick={() => switchTo('live')}
        title="Live — real mainnet data"
        className={`${base} ${mode === 'live' ? 'bg-[#dc2626] text-white' : 'text-[#FFFFFF60] hover:text-[#F9F9F9]'}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${mode === 'live' ? 'bg-white' : 'bg-[#FFFFFF40]'}`} />
        Live
      </button>
    </div>
  );
};
