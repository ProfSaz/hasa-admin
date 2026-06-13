import { apiClient } from './client';

// ============================================================================
// ADMIN AUDIT LOGS — platform activity.
// GET /admin/audit-logs?action=&resource=&limit=&offset= → { data: { logs, count } }
// ============================================================================

export interface AuditLog {
  id: string;
  actor_type: string; // admin | organization | system
  actor_id: string;
  organization_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  ip_address?: string | null;
  details?: Record<string, unknown> | null;
  status: string; // success | failure
  created_at: string;
}

export interface AuditLogFilters {
  action?: string;
  resource?: string;
  limit?: number;
  offset?: number;
}

export const adminAuditApi = {
  list: async (filters: AuditLogFilters = {}): Promise<{ logs: AuditLog[]; count: number }> => {
    const params: Record<string, string | number> = {
      limit: filters.limit ?? 100,
      offset: filters.offset ?? 0,
    };
    if (filters.action) params.action = filters.action;
    if (filters.resource) params.resource = filters.resource;

    const response = await apiClient.get('/admin/audit-logs', { params });
    const data = response.data.data || {};
    return { logs: data.logs || [], count: data.count || 0 };
  },
};
