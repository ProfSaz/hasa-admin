import { apiClient, getAdminRefreshToken } from './client';

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

// Step 1 (password) no longer returns a session token. It returns a short-lived
// MFA challenge token plus whether the admin has MFA enrolled, so the client can
// either prompt for a code (enrolled) or run forced enrollment (not enrolled).
export interface AdminLoginChallengeResponse {
  requires_mfa: boolean;
  mfa_enrolled: boolean;
  challenge_token: string;
  admin: Admin;
}

export interface AdminLoginMFARequest {
  challenge_token: string;
  code: string;
}

// Step 2 (verified second factor) returns the real session token + a refresh
// token (used by the client's silent-refresh interceptor).
export interface AdminLoginResponse {
  token: string;
  refresh_token: string;
  admin: Admin;
}

export const adminAuthApi = {
  // Step 1: email + password → MFA challenge.
  login: async (data: AdminLoginRequest): Promise<AdminLoginChallengeResponse> => {
    const response = await apiClient.post('/admin/login', data);
    return response.data;
  },

  // Step 2: complete login for an already-enrolled admin with a TOTP/backup code.
  loginMfa: async (data: AdminLoginMFARequest): Promise<AdminLoginResponse> => {
    const response = await apiClient.post('/admin/login/mfa', data);
    return response.data;
  },

  // Step-up MFA (P4): re-verify a code mid-session to authorize a nuclear action.
  stepUp: async (code: string): Promise<void> => {
    await apiClient.post('/admin/auth/step-up', { code });
  },

  logout: async (): Promise<void> => {
    // Real revoking logout (P3): send the refresh token so the server can delete
    // it and denylist the access JTI. Best-effort — the client clears its own
    // tokens regardless of the outcome.
    try {
      await apiClient.post('/admin/logout', { refresh_token: getAdminRefreshToken() });
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
