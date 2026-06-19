import { create } from 'zustand';

// ============================================================================
// Global confirmation dialog. Replaces window.confirm / window.prompt with an
// in-app modal. Call `confirmDialog(opts)` from anywhere; it returns a promise
// that resolves to the input string (or '' when no input) if confirmed, or
// null if cancelled.
// ============================================================================

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  input?: {
    label?: string;
    placeholder?: string;
    required?: boolean;
    multiline?: boolean;
    defaultValue?: string;
  };
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions | null;
  _resolve: ((value: string | null) => void) | null;
  request: (opts: ConfirmOptions) => Promise<string | null>;
  resolve: (value: string | null) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: null,
  _resolve: null,

  request: (opts) =>
    new Promise<string | null>((resolve) => {
      const prev = get()._resolve;
      if (prev) prev(null); // supersede any pending dialog
      set({ open: true, options: opts, _resolve: resolve });
    }),

  resolve: (value) => {
    const r = get()._resolve;
    set({ open: false, options: null, _resolve: null });
    r?.(value);
  },
}));

// Convenience: returns the input string (or '' if no input) on confirm, null on cancel.
export const confirmDialog = (opts: ConfirmOptions): Promise<string | null> =>
  useConfirmStore.getState().request(opts);
