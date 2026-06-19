import { apiClient } from './client';

// ============================================================================
// ADMIN ORGANIZATIONS — list + lifecycle actions.
// GET /admin/organizations returns { organizations: [...] } (all orgs).
// approve/suspend are POST actions; suspend requires a reason.
// ============================================================================

export type OrgStatus = 'active' | 'pending' | 'suspended' | 'closed' | string;

// Subset of the backend Organization we actually render.
export interface AdminOrganization {
  id: string;
  name: string;
  email: string;
  status: OrgStatus;
  email_verified: boolean;
  business_name?: string;
  display_name?: string;
  website?: string | null;
  phone?: string | null;
  industry?: string;
  primary_chain?: string;
  kyc_status?: string | null;
  created_at?: string;
}

export interface OrgDetail {
  organization: AdminOrganization;
  dashboard_wallet_creation_enabled: boolean;
  dashboard_payouts_enabled: boolean;
}

// Ledger balance attached to a wallet/address (mode-scoped server-side).
export interface LedgerBalance {
  token_symbol: string;
  token_decimals: number;
  balance: string; // raw base units
  balance_usd?: number | null;
  chain: string;
  network: string;
}

export interface OrgWallet {
  wallet: {
    id: string;
    chain: string;
    network: string;
    address: string;
    created_at?: string;
  };
  balances: LedgerBalance[];
  balance_usd: number;
}

export interface OrgAddress {
  address: {
    id: string;
    address: string;
    chain: string;
    network: string;
    derivation_index?: number | null;
    label?: string | null;
    created_at?: string;
  };
  balances: LedgerBalance[];
  balance_usd: number;
}

export const adminOrgsApi = {
  list: async (): Promise<AdminOrganization[]> => {
    const response = await apiClient.get('/admin/organizations');
    return response.data.organizations || [];
  },

  // Full detail incl. dashboard-write toggle state.
  getDetail: async (id: string): Promise<OrgDetail> => {
    const response = await apiClient.get(`/admin/organizations/${id}`);
    return {
      organization: response.data.organization,
      dashboard_wallet_creation_enabled: !!response.data.dashboard_wallet_creation_enabled,
      dashboard_payouts_enabled: !!response.data.dashboard_payouts_enabled,
    };
  },

  approve: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/organizations/${id}/approve`);
  },

  suspend: async (id: string, reason: string): Promise<void> => {
    await apiClient.post(`/admin/organizations/${id}/suspend`, { reason });
  },

  // Reactivate a suspended org (status → active). Distinct from approve, which
  // is only for pre-activation statuses.
  unsuspend: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/organizations/${id}/unsuspend`);
  },

  // Set KYC status. Gates mainnet asset enablement + mainnet wallet creation,
  // separate from org status/approval. Today: admin flips it directly.
  updateKYC: async (id: string, status: 'approved' | 'rejected' | 'pending' | 'in_review' | 'expired'): Promise<void> => {
    await apiClient.post(`/admin/organizations/${id}/kyc`, { status });
  },

  // Toggle the org's dashboard-write features (platform admin).
  setDashboardFlags: async (id: string, walletCreation: boolean, payouts: boolean): Promise<void> => {
    await apiClient.put(`/admin/organizations/${id}/dashboard-flags`, {
      dashboard_wallet_creation_enabled: walletCreation,
      dashboard_payouts_enabled: payouts,
    });
  },

  // Master wallets for an org with attached ledger balances (mode-scoped server-side).
  listWallets: async (id: string): Promise<OrgWallet[]> => {
    const res = await apiClient.get(`/admin/organizations/${id}/wallets`);
    return res.data.data?.wallets ?? [];
  },

  // Child addresses for an org (mode-scoped, paginated) with attached balances.
  listAddresses: async (
    id: string,
    page = 1,
    limit = 25,
  ): Promise<{ addresses: OrgAddress[]; total: number; page: number; pages: number }> => {
    const res = await apiClient.get(`/admin/organizations/${id}/addresses`, { params: { page, limit } });
    const pag = res.data.pagination || {};
    return {
      addresses: res.data.data?.addresses ?? [],
      total: pag.total ?? 0,
      page: pag.page ?? 1,
      pages: pag.pages ?? 0,
    };
  },
};
