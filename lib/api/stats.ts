import { apiClient } from './client';

// ============================================================================
// ADMIN STATS — platform-wide overview. Backend wraps responses as
// { success, data }. network_type defaults to 'testnet' server-side.
// ============================================================================

export interface AdminStats {
  total_organizations: number;
  active_organizations: number;
  pending_verification: number;
  suspended_organizations: number;
  new_orgs_this_month: number;
  total_users: number;
  new_users_this_week: number;
  today_logins: number;
  total_wallets: number;
  new_wallets_this_week: number;
  platform_volume_usd: number;
  volume_change_this_month: number;
  network_type: string;
}

export interface OrgLeaderboardEntry {
  organization_id: string;
  organization_name: string;
  owner_email: string;
  volume_usd: number;
  user_count: number;
  wallet_count: number;
  status: string;
}

export interface PlatformChainStats {
  chain: string;
  org_count: number;
  deposit_count: number;
  withdrawal_count: number;
  deposit_volume_usd: number;
  withdrawal_volume_usd: number;
  gas_fees_usd: number;
}

export interface OrgDetailedStats {
  organization_id: string;
  organization_name: string;
  owner_email: string;
  status: string;
  network_type: string;
  wallet_count: number;
  address_count: number;
  user_count: number;
  deposit_count: number;
  withdrawal_count: number;
  deposit_volume_usd: number;
  withdrawal_volume_usd: number;
  total_balance_usd: number;
  gas_fees_usd: number;
}

export type NetworkType = 'testnet' | 'mainnet';

export const adminStatsApi = {
  getStats: async (networkType: NetworkType = 'testnet'): Promise<AdminStats> => {
    const response = await apiClient.get('/admin/stats', { params: { network_type: networkType } });
    return response.data.data;
  },

  getOrgLeaderboard: async (networkType: NetworkType = 'testnet', limit = 10): Promise<OrgLeaderboardEntry[]> => {
    const response = await apiClient.get('/admin/stats/organizations', {
      params: { network_type: networkType, limit },
    });
    return response.data.data?.organizations || [];
  },

  getChainBreakdown: async (networkType: NetworkType = 'testnet'): Promise<PlatformChainStats[]> => {
    const response = await apiClient.get('/admin/stats/chains', { params: { network_type: networkType } });
    return response.data.data?.chains || [];
  },

  getOrgDetail: async (orgId: string, networkType: NetworkType = 'testnet'): Promise<OrgDetailedStats> => {
    const response = await apiClient.get(`/admin/stats/organizations/${orgId}`, { params: { network_type: networkType } });
    return response.data.data;
  },
};

// Format a USD figure for display.
export const formatUSD = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null) return '$0.00';
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
