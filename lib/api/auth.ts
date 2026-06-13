import { apiClient } from './client';

// ============================================================================
// ADMIN AUTH — platform staff login against the HasaPay admin surface.
// Backend: POST /api/v1/admin/login → { token, admin } (top-level, not wrapped).
// ============================================================================

export type AdminRole = 'super_admin' | 'admin' | 'support' | 'compliance';

export interface Admin {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  admin: Admin;
}

export const adminAuthApi = {
  login: async (data: AdminLoginRequest): Promise<AdminLoginResponse> => {
    const response = await apiClient.post('/admin/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    // Best-effort — the server logout is stateless (JWT), so a failure here is
    // non-fatal; the client clears its own token regardless.
    try {
      await apiClient.post('/admin/logout');
    } catch {
      /* ignore */
    }
  },
};

// Human-readable role label.
export const adminRoleLabel = (role: AdminRole): string => {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'support':
      return 'Support';
    case 'compliance':
      return 'Compliance';
    default:
      return role;
  }
};
