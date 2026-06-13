import { apiClient } from './client';

// ============================================================================
// ADMIN PAYOUT APPROVAL QUEUE.
// GET /admin/payouts?status= → { data: { payouts, count } }
// approve/reject are POST actions (reject requires a reason).
// ============================================================================

export type PayoutStatus = 'pending' | 'approved' | 'rejected' | 'failed' | string;

export interface PayoutRequest {
  id: string;
  organization_id: string;
  organization_name: string;
  requester_email: string;
  wallet_address: string;
  from_master_wallet_id: string;
  to_address: string;
  amount: string;
  chain: string;
  network: string;
  token_symbol: string;
  status: PayoutStatus;
  review_reason?: string | null;
  reviewed_at?: string | null;
  transaction_id?: string | null;
  error_message?: string | null;
  created_at: string;
}

export const adminPayoutsApi = {
  list: async (status = 'pending'): Promise<{ payouts: PayoutRequest[]; count: number }> => {
    const response = await apiClient.get('/admin/payouts', { params: { status } });
    const data = response.data.data || {};
    return { payouts: data.payouts || [], count: data.count || 0 };
  },

  approve: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/payouts/${id}/approve`);
  },

  reject: async (id: string, reason: string): Promise<void> => {
    await apiClient.post(`/admin/payouts/${id}/reject`, { reason });
  },
};
