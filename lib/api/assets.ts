import { apiClient } from './client';

// Admin asset registry CRUD. List/get wrap in {data:{assets|asset, count}};
// create returns {data:{asset}}; update/activate/deactivate return {message}.

export interface SupportedAsset {
  id: string;
  chain_id: string;
  asset_type: string;
  symbol: string;
  name: string;
  contract_address?: string | null;
  decimals: number;
  is_stablecoin: boolean;
  is_native: boolean;
  icon_url?: string | null;
  coingecko_id?: string | null;
  is_active: boolean;
  is_verified: boolean;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAssetRequest {
  chain_id: string;
  asset_type: string;
  symbol: string;
  name: string;
  contract_address?: string;
  decimals: number;
  is_stablecoin?: boolean;
  is_native?: boolean;
  icon_url?: string;
  coingecko_id?: string;
}

export const assetsApi = {
  list: async (): Promise<SupportedAsset[]> => (await apiClient.get('/admin/assets')).data.data.assets ?? [],
  get: async (id: string): Promise<SupportedAsset> => (await apiClient.get(`/admin/assets/${id}`)).data.data.asset,
  create: async (body: CreateAssetRequest): Promise<SupportedAsset> =>
    (await apiClient.post('/admin/assets', body)).data.data.asset,
  update: async (id: string, body: { name?: string; icon_url?: string; coingecko_id?: string }): Promise<void> => {
    await apiClient.put(`/admin/assets/${id}`, body);
  },
  activate: async (id: string): Promise<void> => { await apiClient.put(`/admin/assets/${id}/activate`); },
  deactivate: async (id: string): Promise<void> => { await apiClient.put(`/admin/assets/${id}/deactivate`); },
};
