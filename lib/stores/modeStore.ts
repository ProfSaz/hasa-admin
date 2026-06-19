import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Admin Test/Live mode. Filters platform DATA views (treasury, revenue, stats,
// transactions) to mainnet vs testnet. Admins switch freely (no approval gate).
// The active mode is also written to a raw localStorage key so the axios
// interceptor can read it synchronously per request.
export type Mode = 'test' | 'live';

interface ModeState {
  mode: Mode;
  setMode: (m: Mode) => void;
}

export const useAdminModeStore = create<ModeState>()(
  persist(
    (set) => ({
      mode: 'test',
      setMode: (m) => {
        if (typeof window !== 'undefined') localStorage.setItem('hasapay-admin-mode', m);
        set({ mode: m });
      },
    }),
    {
      name: 'admin-mode-storage',
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') localStorage.setItem('hasapay-admin-mode', state.mode);
      },
    }
  )
);
