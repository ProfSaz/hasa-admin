import { apiClient } from './client';

// Admin chain + RPC endpoint management. List/get wrap in {data:{chains|chain|endpoints, count}};
// create returns {data:{chain|endpoint}}; update/maintenance/delete return {message}.

export interface SupportedChain {
  id: string;
  chain: string;
  network: string;
  display_name: string;
  chain_type: string;
  native_token_symbol: string;
  native_token_name: string;
  native_token_decimals: number;
  chain_id?: number | null;
  required_confirmations: number;
  average_block_time?: number | null;
  block_explorer_url?: string | null;
  is_active: boolean;
  is_testnet: boolean;
  maintenance_mode: boolean;
  maintenance_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RPCEndpoint {
  id: string;
  chain_id: string;
  url: string;
  priority: number;
  provider_name?: string | null;
  is_websocket: boolean;
  rate_limit_per_second?: number | null;
  is_active: boolean;
  health_status?: string | null;
  response_time_ms?: number | null;
  failure_count: number;
  created_at: string;
}

export interface CreateChainRequest {
  chain: string;
  network: string;
  display_name: string;
  chain_type: string;
  native_token_symbol: string;
  native_token_name: string;
  native_token_decimals: number;
  bip44_coin_type: number;
  required_confirmations: number;
  chain_id?: number;
  average_block_time?: number;
  block_explorer_url?: string;
  is_testnet?: boolean;
}

export const chainsApi = {
  list: async (): Promise<SupportedChain[]> => (await apiClient.get('/admin/chains')).data.data.chains ?? [],
  get: async (id: string): Promise<SupportedChain> => (await apiClient.get(`/admin/chains/${id}`)).data.data.chain,
  create: async (body: CreateChainRequest): Promise<SupportedChain> =>
    (await apiClient.post('/admin/chains', body)).data.data.chain,
  update: async (id: string, body: Partial<SupportedChain>): Promise<void> => {
    await apiClient.put(`/admin/chains/${id}`, body);
  },
  setMaintenance: async (id: string, enabled: boolean, message?: string): Promise<void> => {
    await apiClient.put(`/admin/chains/${id}/maintenance`, { enabled, message });
  },

  listRpc: async (chainId: string): Promise<RPCEndpoint[]> =>
    (await apiClient.get(`/admin/chains/${chainId}/rpc-endpoints`)).data.data.endpoints ?? [],
  createRpc: async (chainId: string, body: { url: string; priority: number; provider_name?: string; is_websocket?: boolean; rate_limit_per_second?: number }): Promise<RPCEndpoint> =>
    (await apiClient.post(`/admin/chains/${chainId}/rpc-endpoints`, body)).data.data.endpoint,
  updateRpc: async (rpcId: string, body: Partial<RPCEndpoint>): Promise<void> => {
    await apiClient.put(`/admin/rpc-endpoints/${rpcId}`, body);
  },
  deleteRpc: async (rpcId: string): Promise<void> => { await apiClient.delete(`/admin/rpc-endpoints/${rpcId}`); },
};
