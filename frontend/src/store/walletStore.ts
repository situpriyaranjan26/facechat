import { create } from 'zustand';
import type { WalletTransaction } from '@/types';
import apiClient from '@/lib/api';

interface WalletState {
  balance: number;
  isLowBalance: boolean;
  isZeroBalance: boolean;
  transactions: WalletTransaction[];
  totalEarned: number;
  totalSpent: number;
  totalPurchased: number;
  totalBonuses: number;
  setBalance: (n: number) => void;
  setTransactions: (txns: WalletTransaction[]) => void;
  fetchBalance: () => Promise<void>;
  setWalletData: (data: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
    totalPurchased: number;
    totalBonuses: number;
  }) => void;
}

const LOW_BALANCE_THRESHOLD = 100;
const ZERO_BALANCE_THRESHOLD = 0;

export const useWalletStore = create<WalletState>((set) => ({
  balance: 0,
  isLowBalance: false,
  isZeroBalance: false,
  transactions: [],
  totalEarned: 0,
  totalSpent: 0,
  totalPurchased: 0,
  totalBonuses: 0,

  setBalance: (n) =>
    set({
      balance: n,
      isLowBalance: n <= LOW_BALANCE_THRESHOLD && n > ZERO_BALANCE_THRESHOLD,
      isZeroBalance: n <= ZERO_BALANCE_THRESHOLD,
    }),

  fetchBalance: async () => {
    try {
      const res = await apiClient.get('/wallet/balance');
      const b = res.data?.balance ?? res.data?.data?.balance ?? 0;
      set({
        balance: b,
        isLowBalance: b <= LOW_BALANCE_THRESHOLD && b > ZERO_BALANCE_THRESHOLD,
        isZeroBalance: b <= ZERO_BALANCE_THRESHOLD,
      });
    } catch {
      // Guest fallback: query guest session tokens
      try {
        const guestToken = typeof window !== 'undefined' ? (sessionStorage.getItem('guest_token') || localStorage.getItem('guest_token')) : null;
        if (guestToken) {
          const gRes = await apiClient.get(`/guest/status?token=${guestToken}`);
          if (gRes.data?.data?.tokens !== undefined) {
            const b = Number(gRes.data.data.tokens);
            set({
              balance: b,
              isLowBalance: b <= LOW_BALANCE_THRESHOLD && b > ZERO_BALANCE_THRESHOLD,
              isZeroBalance: b <= ZERO_BALANCE_THRESHOLD,
            });
            return;
          }
        }
      } catch {}

      // Default welcome grant for guests
      set((state) => ({
        balance: state.balance > 0 ? state.balance : 10,
        isLowBalance: false,
        isZeroBalance: false,
      }));
    }
  },

  setTransactions: (txns) => set({ transactions: txns }),

  setWalletData: (data) =>
    set({
      balance: data.balance,
      isLowBalance: data.balance <= LOW_BALANCE_THRESHOLD && data.balance > ZERO_BALANCE_THRESHOLD,
      isZeroBalance: data.balance <= ZERO_BALANCE_THRESHOLD,
      totalEarned: data.totalEarned,
      totalSpent: data.totalSpent,
      totalPurchased: data.totalPurchased,
      totalBonuses: data.totalBonuses,
    }),
}));
