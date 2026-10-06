import axios from 'axios';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. LocalStorage override (emergency fallback if configured)
    const custom = localStorage.getItem('facechat_backend_url');
    if (custom) return custom.replace(/\/+$/, '');

    // 2. Build-time NEXT_PUBLIC_API_URL if configured and not localhost
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes('localhost')) {
      return envUrl.replace(/\/+$/, '');
    }

    // 3. When deployed on Render (e.g. facechat-frontend-5dbq.onrender.com)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      if (window.location.hostname.includes('onrender.com')) {
        return 'https://facechat-backend-5dbq.onrender.com';
      }
      return ''; // Relative proxy
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:4000';
}

export const apiClient = axios.create({
  baseURL: `${getApiBaseUrl()}/api`,
  withCredentials: true,
  timeout: 15000, // 15-second timeout to prevent infinite hang
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dynamic request interceptor to ensure current token & dynamic base URL are always attached
apiClient.interceptors.request.use(
  (config) => {
    const base = getApiBaseUrl();
    if (base) {
      config.baseURL = `${base}/api`;
    } else {
      config.baseURL = '/api';
    }

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('facechat_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with timeout and clear error messaging
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.friendlyMessage = 'Server request timed out. Free-tier backend may be waking up — please retry in a few seconds.';
    } else if (error.message === 'Network Error') {
      error.friendlyMessage = 'Network error connecting to FaceChat server. Please check your connection or retry in a moment.';
    }

    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
        // Handled where appropriate
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  me: () => apiClient.get('/auth/me'),
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  signup: (email: string, password: string, displayName: string) =>
    apiClient.post('/auth/register', { email, password, displayName }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('facechat_token');
    }
    return apiClient.post('/auth/logout');
  },
  googleOAuth: () => `${getApiBaseUrl()}/api/auth/google`,
  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }),
  guestSession: (fingerprint?: string) =>
    apiClient.post('/guest/session', { fingerprint }),
  guestStatus: (token: string) =>
    apiClient.get(`/guest/status?token=${token}`),
  convertGuest: (guestToken: string) =>
    apiClient.post('/guest/convert', { guestToken }),
};

// ─── Wallet ──────────────────────────────────────────────────────────────────
export const walletApi = {
  getBalance: () => apiClient.get('/wallet/balance'),
  getTransactions: (limit = 20, offset = 0) =>
    apiClient.get(`/wallet/transactions?limit=${limit}&offset=${offset}`),
  buyCoins: (bundleId: string) =>
    apiClient.post('/payments/coin-purchase', { bundleId }),
};

// ─── Female Pass ─────────────────────────────────────────────────────────────
export const femalePassApi = {
  getStatus: () => apiClient.get('/subscriptions/female-pass'),
  activate: () => apiClient.post('/payments/female-pass'),
};

export default apiClient;
