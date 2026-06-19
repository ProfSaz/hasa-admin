import axios from 'axios';
import { useStepUpStore } from '@/lib/stores/stepUpStore';

// Admin API client. Mirrors the org dashboard's client but uses a separate
// token key ('admin_token') so the two apps never share a session, and points
// every request at the HasaPay backend's /api/v1 surface.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const ADMIN_TOKEN_KEY = 'admin_token';
export const ADMIN_REFRESH_KEY = 'admin_refresh_token';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the admin JWT + Test/Live mode to every request.
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Test/Live mode — read the raw key directly (synchronous). Default test.
    config.headers['X-HasaPay-Mode'] = localStorage.getItem('hasapay-admin-mode') || 'test';
  }
  return config;
});

// ── Silent refresh (P3) ────────────────────────────────────────────────────
// The admin access token is short-lived. On a 401 we try once to exchange the
// stored refresh token for a fresh pair and replay the original request. If the
// refresh fails (expired / revoked / force-logout-all), clear the session and
// bounce to login. A module-level promise de-dupes concurrent refreshes so a
// burst of 401s triggers only one refresh call.
let refreshInFlight: Promise<string | null> | null = null;

const doRefresh = async (): Promise<string | null> => {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_REFRESH_KEY) : null;
  if (!refreshToken) return null;
  try {
    // Bare axios (not apiClient) so this call skips the interceptors below.
    const res = await axios.post(`${API_URL}/api/v1/admin/auth/refresh`, {
      refresh_token: refreshToken,
    });
    setAdminTokens(res.data.token, res.data.refresh_token);
    return res.data.token as string;
  } catch {
    return null;
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const url: string = original.url || '';
    const status = error.response?.status;
    const errorCode = error.response?.data?.error?.code;

    // Step-up MFA (P4): a nuclear action returned 403 STEP_UP_REQUIRED. Prompt
    // for a fresh code via the global modal, then retry the original request once.
    if (status === 403 && errorCode === 'STEP_UP_REQUIRED' && !original._stepUp) {
      original._stepUp = true;
      try {
        await useStepUpStore.getState().request();
        return apiClient(original);
      } catch {
        return Promise.reject(error);
      }
    }

    const isAuthFlow =
      url.includes('/admin/login') ||
      url.includes('/admin/auth/refresh') ||
      url.includes('/admin/logout');

    if (status === 401 && !isAuthFlow && !original._retry) {
      original._retry = true;
      if (!refreshInFlight) {
        refreshInFlight = doRefresh().finally(() => {
          refreshInFlight = null;
        });
      }
      const newToken = await refreshInFlight;
      if (newToken) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
      // Refresh failed — session is dead.
      if (typeof window !== 'undefined') {
        clearAdminToken();
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

// Persist the admin access token to localStorage (for the interceptor) + a
// cookie (so a future Next middleware can guard /admin server-side), plus the
// refresh token used by silent refresh.
export const setAdminTokens = (token: string, refreshToken?: string) => {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  document.cookie = `admin_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`;
  if (refreshToken) {
    localStorage.setItem(ADMIN_REFRESH_KEY, refreshToken);
  }
};

// Back-compat alias (access token only).
export const setAdminToken = (token: string) => setAdminTokens(token);

export const getAdminRefreshToken = (): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem(ADMIN_REFRESH_KEY) : null;

export const clearAdminToken = () => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_REFRESH_KEY);
  document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};
