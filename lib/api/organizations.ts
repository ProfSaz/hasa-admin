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
  co_custody_enabled: boolean;
  onflight_fee_collection: boolean;
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
    custody_type?: string; // 'hasa' | 'co_custody'
    created_at?: string;
  };
  balances: LedgerBalance[];
  balance_usd: number;
  // Co-custody fragment state (per wallet).
  fragments_generated?: boolean; // org has minted its recovery set at least once
  regen_authorized?: boolean; // a one-time admin grant to regenerate is pending
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

export interface OrgFeeWallet {
  id: string;
  chain: string;
  network: string;
  is_testnet: boolean;
  address: string;
  native_symbol: string;
  native_decimals: number;
  balance: string; // human-readable native amount
  balance_raw: string; // smallest unit
  low_gas: boolean;
  balance_known: boolean; // false = RPC unavailable, balance is a placeholder
  is_active: boolean;
  created_at?: string;
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
      co_custody_enabled: !!response.data.co_custody_enabled,
      onflight_fee_collection: !!response.data.onflight_fee_collection,
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

  // Toggle the org's co-custody features (customer-held key fragments +
  // on-flight fee collection). Platform admin.
  setCoCustodyFlags: async (id: string, coCustody: boolean, onflightFee: boolean): Promise<void> => {
    await apiClient.put(`/admin/organizations/${id}/cocustody-flags`, {
      co_custody_enabled: coCustody,
      onflight_fee_collection: onflightFee,
    });
  },

  // Master wallets for an org with attached ledger balances (mode-scoped server-side).
  listWallets: async (id: string): Promise<OrgWallet[]> => {
    const res = await apiClient.get(`/admin/organizations/${id}/wallets`);
    return res.data.data?.wallets ?? [];
  },

  // Grant a one-time pass for the org to regenerate co-custody fragments on a
  // wallet that already has them. The admin only authorizes — the org regenerates
  // with its own passphrase, and the grant is consumed on success. Step-up MFA is
  // enforced server-side and handled automatically by the client interceptor.
  authorizeFragmentRegen: async (orgId: string, walletId: string): Promise<void> => {
    await apiClient.post(`/admin/organizations/${orgId}/wallets/${walletId}/cocustody/authorize-regen`);
  },

  // Withdraw a previously granted (and not-yet-consumed) regeneration pass.
  revokeFragmentRegen: async (orgId: string, walletId: string): Promise<void> => {
    await apiClient.delete(`/admin/organizations/${orgId}/wallets/${walletId}/cocustody/authorize-regen`);
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

  // Gas/fee wallets for an org with LIVE on-chain native balance + low-gas flag.
  // Returns both mainnet + testnet rows tagged with is_testnet; the UI splits by mode.
  listFeeWallets: async (id: string): Promise<OrgFeeWallet[]> => {
    const res = await apiClient.get(`/admin/organizations/${id}/fee-wallets`);
    return res.data.data?.fee_wallets ?? [];
  },
};
