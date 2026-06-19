import { apiClient } from './client';
import type { Admin } from './auth';

// ============================================================================
// ADMIN MFA — TOTP enrollment + management.
//
// Enrollment endpoints accept EITHER a full admin JWT (re-manage) OR a
// short-lived MFA challenge token (first-login forced enrollment). During first
// login there is no session token in localStorage yet, so the challenge token is
// passed explicitly via the Authorization header.
//
// Status / disable / regenerate run with the normal session JWT (auto-attached
// by the client interceptor) — used by the admin security settings page.
// ============================================================================

export interface MFAEnrollBeginResponse {
  secret: string; // base32 secret for manual entry
  otpauth_url: string; // otpauth:// URI for the QR code
}

export interface MFAEnrollVerifyResponse {
  backup_codes: string[];
  // Present on the first-login path: a session (access + refresh) is issued
  // immediately so the admin isn't bounced back to the password screen.
  token?: string;
  refresh_token?: string;
  admin?: Admin;
}

export interface MFAStatusResponse {
  enabled: boolean;
  enrolled_at?: string;
  backup_codes_remaining: number;
}

const challengeHeader = (challengeToken: string) => ({
  headers: { Authorization: `Bearer ${challengeToken}` },
});

export const adminMfaApi = {
  // First-login enrollment (challenge-token authorized).
  enrollBegin: async (challengeToken: string): Promise<MFAEnrollBeginResponse> => {
    const res = await apiClient.post('/admin/auth/mfa/enroll', {}, challengeHeader(challengeToken));
    return res.data.data;
  },

  enrollVerify: async (challengeToken: string, code: string): Promise<MFAEnrollVerifyResponse> => {
    const res = await apiClient.post(
      '/admin/auth/mfa/enroll/verify',
      { code },
      challengeHeader(challengeToken)
    );
    return res.data.data;
  },

  // Logged-in management (session-JWT authorized).
  status: async (): Promise<MFAStatusResponse> => {
    const res = await apiClient.get('/admin/auth/mfa/status');
    return res.data.data;
  },

  disable: async (code: string): Promise<void> => {
    await apiClient.post('/admin/auth/mfa/disable', { code });
  },

  regenerateBackupCodes: async (code: string): Promise<string[]> => {
    const res = await apiClient.post('/admin/auth/mfa/backup-codes/regenerate', { code });
    return res.data.data.backup_codes;
  },
};
