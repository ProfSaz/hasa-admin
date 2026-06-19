import { create } from 'zustand';

// ============================================================================
// Step-up MFA modal coordinator (P4). When the API returns 403 STEP_UP_REQUIRED,
// the axios interceptor calls request() — which opens a global modal and returns
// a promise that resolves once the user verifies a fresh MFA code (the modal
// calls resolve()) or rejects if they cancel. The interceptor then retries the
// original request.
// ============================================================================

interface StepUpState {
  open: boolean;
  _resolve: (() => void) | null;
  _reject: ((reason?: unknown) => void) | null;
  request: () => Promise<void>;
  resolve: () => void;
  cancel: () => void;
}

export const useStepUpStore = create<StepUpState>((set, get) => ({
  open: false,
  _resolve: null,
  _reject: null,

  request: () =>
    new Promise<void>((resolve, reject) => {
      // If a step-up is already pending, reject the new one to avoid stacking.
      const existing = get()._reject;
      if (existing) existing(new Error('step-up superseded'));
      set({ open: true, _resolve: resolve, _reject: reject });
    }),

  resolve: () => {
    const r = get()._resolve;
    set({ open: false, _resolve: null, _reject: null });
    r?.();
  },

  cancel: () => {
    const r = get()._reject;
    set({ open: false, _resolve: null, _reject: null });
    r?.(new Error('step-up cancelled'));
  },
}));
