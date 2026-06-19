import { apiClient } from './client';
import type { AdminRole } from './auth';

// ============================================================================
// ADMIN PROVISIONING (P4) — super-admin-only management of admin accounts.
// Destructive calls (create / role / disable / reset-mfa) are gated by step-up
// MFA on the backend; the client's interceptor handles the STEP_UP_REQUIRED
// prompt + retry transparently.
// ============================================================================

export interface AdminAccount {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  is_active: boolean;
  last_login_at?: string | null;
  created_at?: string;
}

export interface CreateAdminRequest {
  email: string;
  full_name: string;
  role: AdminRole;
  password: string;
}

export const adminsApi = {
  list: async (): Promise<AdminAccount[]> => {
    const res = await apiClient.get('/admin/admins');
    return res.data.data;
  },
  create: async (data: CreateAdminRequest): Promise<AdminAccount> => {
    const res = await apiClient.post('/admin/admins', data);
    return res.data.data;
  },
  updateRole: async (id: string, role: AdminRole): Promise<void> => {
    await apiClient.put(`/admin/admins/${id}/role`, { role });
  },
  disable: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/admins/${id}/disable`);
  },
  enable: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/admins/${id}/enable`);
  },
  resetMfa: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/admins/${id}/reset-mfa`);
  },
};
