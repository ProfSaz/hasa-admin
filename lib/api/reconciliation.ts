import { apiClient } from './client';

// Admin reconciliation: run checks, browse reports, approve/reject discrepancies.
// Endpoints wrap in {success, data} (or top-level {success, message} for actions).

export interface ReconciliationReport {
  id: string;
  organization_id?: string | null;
  admin_id: string;
  status: string;
  total_checked: number;
  matches: number;
  discrepancies: number;
  notes?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface ReconciliationDiscrepancy {
  id: string;
  report_id: string;
  wallet_type: string;
  wallet_id: string;
  chain: string;
  network: string;
  address: string;
  token_symbol: string;
  token_decimals: number;
  ledger_balance: string;
  blockchain_balance: string;
  difference: string;
  direction: string;
  status: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface ReportWithDiscrepancies {
  report: ReconciliationReport;
  discrepancies: ReconciliationDiscrepancy[];
}

export const reconciliationApi = {
  run: async (orgId?: string): Promise<ReportWithDiscrepancies> =>
    (await apiClient.post('/admin/reconcile', null, { params: orgId ? { org_id: orgId } : {} })).data.data,
  listReports: async (limit = 20, offset = 0): Promise<{ reports: ReconciliationReport[]; total: number }> =>
    (await apiClient.get('/admin/reconcile/reports', { params: { limit, offset } })).data.data,
  getReport: async (id: string): Promise<ReportWithDiscrepancies> =>
    (await apiClient.get(`/admin/reconcile/reports/${id}`)).data.data,
  approve: async (id: string, notes?: string): Promise<void> => {
    await apiClient.post(`/admin/reconcile/approve/${id}`, { notes });
  },
  reject: async (id: string, notes?: string): Promise<void> => {
    await apiClient.post(`/admin/reconcile/reject/${id}`, { notes });
  },
};
