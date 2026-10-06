import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
        // window.location.href = '/auth/login';
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
  logout: () => apiClient.post('/auth/logout'),
  googleOAuth: () => `${API_URL}/api/auth/google`,
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
