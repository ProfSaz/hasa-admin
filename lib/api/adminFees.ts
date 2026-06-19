import { apiClient } from './client';

// Admin fee configuration: platform defaults, per-org configs, per-chain overrides.
// Endpoints wrap in {success, [message], data}. Rates are decimals (0.01 = 1%).

export interface FeeConfiguration {
  id: string;
  scope: string;
  organization_id?: string | null;
  deposit_fee_enabled: boolean;
  deposit_fee_type: string;
  deposit_fee_rate: number;
  deposit_fee_min: string;
  deposit_fee_max: string;
  withdrawal_fee_enabled: boolean;
  withdrawal_fee_type: string;
  withdrawal_fee_rate: number;
  withdrawal_fee_min: string;
  withdrawal_fee_max: string;
  org_fee_enabled: boolean;
  org_deposit_fee_rate: number;
  org_withdrawal_fee_rate: number;
  rev_share_enabled: boolean;
  rev_share_percentage: number;
  gasless_enabled: boolean;
  chain?: string | null;
  network?: string | null;
  token_symbol?: string | null;
  min_deposit_usd: number;
  min_withdrawal_usd: number;
  notes?: string | null;
  updated_at?: string;
}

export interface OrgConfigsPage {
  configs: FeeConfiguration[];
  total: number;
  limit: number;
  offset: number;
}

export interface EffectiveOrgConfig {
  effective: FeeConfiguration;
  has_custom: boolean;
  org_config: FeeConfiguration | null;
}

export interface ChainOverrides {
  organization_id: string;
  chain_overrides: FeeConfiguration[];
  count: number;
}

export const adminFeesApi = {
  getPlatform: async (): Promise<FeeConfiguration> => (await apiClient.get('/admin/fees/platform')).data.data,
  updatePlatform: async (body: Partial<FeeConfiguration>): Promise<FeeConfiguration> =>
    (await apiClient.put('/admin/fees/platform', body)).data.data,

  listOrgConfigs: async (limit = 50, offset = 0): Promise<OrgConfigsPage> =>
    (await apiClient.get('/admin/fees/orgs', { params: { limit, offset } })).data.data,
  getOrgConfig: async (orgId: string): Promise<EffectiveOrgConfig> =>
    (await apiClient.get(`/admin/fees/orgs/${orgId}`)).data.data,
  setOrgConfig: async (orgId: string, body: Partial<FeeConfiguration>): Promise<FeeConfiguration> =>
    (await apiClient.put(`/admin/fees/orgs/${orgId}`, body)).data.data,
  deleteOrgConfig: async (orgId: string): Promise<void> => { await apiClient.delete(`/admin/fees/orgs/${orgId}`); },

  listChainConfigs: async (orgId: string): Promise<ChainOverrides> =>
    (await apiClient.get(`/admin/fees/orgs/${orgId}/chain-configs`)).data.data,
  setChainConfig: async (orgId: string, body: Partial<FeeConfiguration>): Promise<FeeConfiguration> =>
    (await apiClient.put(`/admin/fees/orgs/${orgId}/chain-configs`, body)).data.data,
  deleteChainConfig: async (orgId: string, configId: string): Promise<void> => {
    await apiClient.delete(`/admin/fees/orgs/${orgId}/chain-configs/${configId}`);
  },
};
