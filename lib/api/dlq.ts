import { apiClient } from './client';

// Admin dead-letter-queue: failed transactions awaiting review/retry.
// Wraps in {success, data}; list under data.transactions, actions return {message}.

export interface DLQTransaction {
  id: string;
  organization_id: string;
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
  tx_hash?: string | null;
  retry_count: number;
  error_message?: string | null;
  failure_reason?: string | null;
  failed_at?: string | null;
  dlq_at?: string | null;
  dlq_reviewed: boolean;
  dlq_reviewed_at?: string | null;
  dlq_reviewed_by?: string | null;
  created_at: string;
}

export interface DLQStats {
  total_failed: number;
  unreviewed_count: number;
  by_reason: Record<string, number>;
  by_chain: Record<string, number>;
}

export const dlqApi = {
  list: async (limit = 50): Promise<DLQTransaction[]> =>
    (await apiClient.get('/admin/dlq', { params: { limit } })).data.data.transactions ?? [],
  stats: async (): Promise<DLQStats> => (await apiClient.get('/admin/dlq/stats')).data.data,
  get: async (id: string): Promise<DLQTransaction> => (await apiClient.get(`/admin/dlq/${id}`)).data.data,
  markReviewed: async (id: string): Promise<void> => { await apiClient.post(`/admin/dlq/${id}/reviewed`); },
  retry: async (id: string): Promise<void> => { await apiClient.post(`/admin/dlq/${id}/retry`); },
};
