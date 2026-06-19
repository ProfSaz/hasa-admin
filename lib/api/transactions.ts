import { apiClient } from './client';

// ============================================================================
// ADMIN TRANSACTIONS — cross-org transaction oversight.
// GET /admin/transactions → { data: { transactions, count }, pagination }
// Scoped to the active Test/Live mode (X-HasaPay-Mode header) server-side.
// ============================================================================

export interface AdminTransaction {
  id: string;
  organization_id: string;
  tx_hash?: string | null;
  chain: string;
  network: string;
  type: string;
  status: string;
  from_address: string;
  to_address: string;
  amount: string;
  amount_formatted?: string | null;
  amount_usd?: number | null;
  token_symbol?: string | null;
  token_decimals?: number | null;
  failure_reason?: string | null;
  created_at: string;
}

export interface TransactionFilters {
  org_id?: string;
  status?: string;
  type?: string;
  chain?: string;
  page?: number;
  limit?: number;
}

export interface AdminTransactionsResult {
  transactions: AdminTransaction[];
  total: number;
  page: number;
  pages: number;
}

// Calibrate a raw base-unit string to human units using token decimals.
function calibrate(raw: string, decimals: number): string {
  if (!raw) return '0';
  const neg = raw.startsWith('-');
  const digits = (neg ? raw.slice(1) : raw).replace(/[^0-9]/g, '').padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals) || '0';
  let frac = decimals > 0 ? digits.slice(digits.length - decimals) : '';
  frac = frac.replace(/0+$/, '');
  return `${neg ? '-' : ''}${whole}${frac ? '.' + frac : ''}`;
}

// Human-readable token amount for a transaction. Always calibrates from
// token_decimals (sweeps/withdrawals store raw amounts with no amount_formatted);
// falls back to amount_formatted then the raw value only when decimals are absent.
export function displayAmount(t: Pick<AdminTransaction, 'amount' | 'amount_formatted' | 'token_decimals'>): string {
  if (t.token_decimals != null && t.token_decimals >= 0) return calibrate(t.amount, t.token_decimals);
  return t.amount_formatted || t.amount;
}

export const adminTransactionsApi = {
  list: async (filters: TransactionFilters = {}): Promise<AdminTransactionsResult> => {
    // Strip empty params so we don't send blank filters.
    const params: Record<string, string | number> = {};
    if (filters.org_id) params.org_id = filters.org_id;
    if (filters.status) params.status = filters.status;
    if (filters.type) params.type = filters.type;
    if (filters.chain) params.chain = filters.chain;
    params.page = filters.page ?? 1;
    params.limit = filters.limit ?? 25;

    const res = await apiClient.get('/admin/transactions', { params });
    const data = res.data.data || {};
    const pag = res.data.pagination || {};
    return {
      transactions: data.transactions || [],
      total: pag.total ?? 0,
      page: pag.page ?? 1,
      pages: pag.pages ?? 0,
    };
  },
};
