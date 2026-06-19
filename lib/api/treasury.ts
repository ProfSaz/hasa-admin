import { apiClient } from './client';

// Admin treasury + revenue analytics (G6). Endpoints wrap payloads in {success, data}.

export interface TreasuryBalance {
  chain: string;
  network: string;
  token: string;
  token_address?: string | null;
  balance_raw: string;
  balance_formatted?: string; // human units (decimals applied by backend)
  token_decimals?: number;
  balance_usd: number;
  last_sweep_at?: string | null;
  last_sweep_amount_usd?: number | null;
  pending_sweep?: boolean;
}

export interface TreasuryBalances {
  total_usd: number;
  balances: TreasuryBalance[];
}

export interface RevenueSummary {
  total_deposit_volume_usd: number;
  gross_platform_fees_usd: number;
  rev_share_paid_out_usd: number;
  net_revenue_usd: number;
  total_orgs: number;
  active_orgs: number;
  total_deposits: number;
}

export interface RevenueByOrg {
  org_id: string;
  org_name: string;
  deposit_count: number;
  deposit_volume_usd: number;
  gross_platform_fee_usd: number;
  rev_share_paid_usd: number;
  net_revenue_usd: number;
  org_fee_collected_usd: number;
}

export interface RevenueResponse {
  summary: RevenueSummary;
  by_org: RevenueByOrg[];
  by_chain: { chain: string; network: string; deposit_volume_usd: number; net_revenue_usd: number; deposit_count: number }[];
  by_token: { token: string; deposit_volume_usd: number; net_revenue_usd: number; deposit_count: number }[];
}

export interface TreasurySweepRow {
  id: string;
  chain: string;
  network: string;
  token_symbol: string;
  amount_raw: string;
  amount_usd: number;
  destination: string;
  tx_hash?: string | null;
  status: string;
  gas_cost_usd?: number | null;
  gas_token?: string | null;
  swept_by_admin?: string | null;
  created_at: string;
}

export interface TreasuryHistory {
  data: TreasurySweepRow[];
  pagination: { page: number; limit: number; total: number; pages: number };
  totals: { total_swept_usd: number; sweep_count: number };
}

export interface TreasuryConfig {
  id: string;
  min_sweep_usd: number;
  updated_at?: string;
}

export interface SweepRequest {
  chain: string;
  network: string;
  token: string;
  org_id?: string | null;
  force?: boolean;
}

export const treasuryApi = {
  balances: async (): Promise<TreasuryBalances> => {
    // Backend returns balances:null when there are no rows for the active mode
    // (e.g. live mode with no mainnet treasury yet) — normalize to [] so callers
    // can safely read .length / .map.
    const d = (await apiClient.get('/admin/fees/treasury')).data.data ?? {};
    return { total_usd: d.total_usd ?? 0, balances: d.balances ?? [] };
  },
  revenue: async (period = 'all'): Promise<RevenueResponse> => {
    // Normalize null arrays (live mode with no mainnet revenue) so .map is safe.
    const d = (await apiClient.get('/admin/fees/revenue', { params: { period } })).data.data ?? {};
    return {
      summary: d.summary ?? { total_deposit_volume_usd: 0, gross_platform_fees_usd: 0, rev_share_paid_out_usd: 0, net_revenue_usd: 0, total_orgs: 0, active_orgs: 0, total_deposits: 0 },
      by_org: d.by_org ?? [],
      by_chain: d.by_chain ?? [],
      by_token: d.by_token ?? [],
    };
  },
  history: async (page = 1, limit = 20): Promise<TreasuryHistory> => {
    const res = await apiClient.get('/admin/fees/treasury/history', { params: { page, limit } });
    return {
      data: res.data.data ?? [],
      pagination: res.data.pagination ?? { page, limit, total: 0, pages: 0 },
      totals: res.data.totals ?? { total_swept_usd: 0, sweep_count: 0 },
    };
  },
  config: async (): Promise<TreasuryConfig> => (await apiClient.get('/admin/fees/treasury/config')).data.data,
  updateConfig: async (min_sweep_usd: number): Promise<TreasuryConfig> =>
    (await apiClient.put('/admin/fees/treasury/config', { min_sweep_usd })).data.data,
  sweep: async (body: SweepRequest): Promise<any> => (await apiClient.post('/admin/fees/treasury/sweep', body)).data.data,
  gasAbsorbed: async (period: string): Promise<any> =>
    (await apiClient.get('/admin/fees/gas-absorbed', { params: { period } })).data.data,
};
