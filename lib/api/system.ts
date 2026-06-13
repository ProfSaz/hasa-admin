import { apiClient } from './client';

// ============================================================================
// ADMIN SYSTEM — chains (with maintenance toggle), DLQ health, price mode.
// ============================================================================

export interface SupportedChain {
  id: string;
  chain: string;
  network: string;
  display_name: string;
  chain_type: string;
  native_token_symbol: string;
  is_active: boolean;
  is_testnet: boolean;
  maintenance_mode: boolean;
  block_explorer_url?: string | null;
}

export interface DLQStats {
  total_failed: number;
  unreviewed_count: number;
  by_reason: Record<string, number>;
  by_chain: Record<string, number>;
}

export interface PriceMode {
  price_mode: string;
  is_mock: boolean;
}

export const adminSystemApi = {
  getChains: async (): Promise<SupportedChain[]> => {
    const response = await apiClient.get('/admin/chains');
    return response.data.data?.chains || [];
  },

  setChainMaintenance: async (id: string, enabled: boolean, message?: string): Promise<void> => {
    await apiClient.put(`/admin/chains/${id}/maintenance`, { enabled, message });
  },

  getDLQStats: async (): Promise<DLQStats> => {
    const response = await apiClient.get('/admin/dlq/stats');
    return response.data.data;
  },

  getPriceMode: async (): Promise<PriceMode> => {
    const response = await apiClient.get('/admin/stats/price-mode');
    return response.data.data;
  },
};
