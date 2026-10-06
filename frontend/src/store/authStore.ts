import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isGuest: boolean
  guestToken: string | null
  guestTimeRemaining: number
  guestWarning: boolean
  isLoading: boolean
  login: (user: User) => void
  logout: () => void
  setGuestToken: (token: string) => void
  updateGuestTime: (seconds: number) => void
  setGuestWarning: (warn: boolean) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isGuest: false,
  guestToken: null,
  guestTimeRemaining: 0,
  guestWarning: false,
  isLoading: true,

  login: (user) =>
    set({
      user,
      isAuthenticated: true,
      isGuest: false,
      guestToken: null,
      guestWarning: false,
    }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isGuest: false,
      guestToken: null,
      guestTimeRemaining: 0,
      guestWarning: false,
    }),

  setGuestToken: (token) =>
    set({
      guestToken: token,
      isGuest: true,
      isAuthenticated: false,
    }),

  updateGuestTime: (seconds) =>
    set({
      guestTimeRemaining: seconds,
      guestWarning: seconds <= 120 && seconds > 0,
    }),

  setGuestWarning: (warn) => set({ guestWarning: warn }),

  setLoading: (loading) => set({ isLoading: loading }),
}))
