import axios from 'axios';

// Admin API client. Mirrors the org dashboard's client but uses a separate
// token key ('admin_token') so the two apps never share a session, and points
// every request at the HasaPay backend's /api/v1 surface.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const ADMIN_TOKEN_KEY = 'admin_token';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the admin JWT to every request.
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// On 401 (expired/invalid admin token) clear the session and bounce to login —
// except for the login call itself, which should surface its own error.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/admin/login');
    if (error.response?.status === 401 && !isLoginEndpoint) {
      if (typeof window !== 'undefined') {
        clearAdminToken();
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// Persist the admin token to localStorage (for the interceptor) + a cookie
// (so a future Next middleware can guard /admin server-side).
export const setAdminToken = (token: string) => {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  document.cookie = `admin_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`;
};

export const clearAdminToken = () => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};
