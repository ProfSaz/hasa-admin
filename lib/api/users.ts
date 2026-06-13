import { apiClient } from './client';

// ============================================================================
// ADMIN USERS — every organization member across the platform.
// GET /admin/users → { data: { users, count } }
// ============================================================================

export interface AdminUser {
  membership_id: string;
  user_id: string;
  full_name: string;
  email: string;
  organization: string;
  role: string;
  status: string; // membership status: active | deactivated
  last_login_at?: string | null;
  is_admin: boolean;
}

export const adminUsersApi = {
  list: async (limit = 100, offset = 0): Promise<{ users: AdminUser[]; count: number }> => {
    const response = await apiClient.get('/admin/users', { params: { limit, offset } });
    const data = response.data.data || {};
    return { users: data.users || [], count: data.count || 0 };
  },
};
