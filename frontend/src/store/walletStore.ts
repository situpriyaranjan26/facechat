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
      const b = res.data?.data?.balance ?? 0;
      set({
        balance: b,
        isLowBalance: b <= LOW_BALANCE_THRESHOLD && b > ZERO_BALANCE_THRESHOLD,
        isZeroBalance: b <= ZERO_BALANCE_THRESHOLD,
      });
    } catch {
      // ignore
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
