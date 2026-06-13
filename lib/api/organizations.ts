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
  created_at?: string;
}

export interface OrgDetail {
  organization: AdminOrganization;
  dashboard_wallet_creation_enabled: boolean;
  dashboard_payouts_enabled: boolean;
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

  // Toggle the org's dashboard-write features (platform admin).
  setDashboardFlags: async (id: string, walletCreation: boolean, payouts: boolean): Promise<void> => {
    await apiClient.put(`/admin/organizations/${id}/dashboard-flags`, {
      dashboard_wallet_creation_enabled: walletCreation,
      dashboard_payouts_enabled: payouts,
    });
  },
};
