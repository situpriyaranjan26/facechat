'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Video,
  Wallet,
  User,
  Settings,
  Shield,
  LogOut,
  LogIn,
  Menu,
  X,
  ChevronDown,
  Clock,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useWalletStore } from '@/store/walletStore'
import { Button } from '@/components/ui/Button'
import { CoinDisplay } from '@/components/ui/CoinDisplay'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { authApi } from '@/lib/api'
import toast from 'react-hot-toast'

export function Navbar() {
  const router = useRouter()
  const { user, isAuthenticated, isGuest, logout } = useAuthStore()
  const { balance, isLowBalance } = useWalletStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Mock female pass — replace with real data from store/hook
  const femalePassActive = false
  const femalePassMinutes = 0

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore
    } finally {
      logout()
      router.push('/')
      toast.success('Logged out')
    }
  }

  const handleStartTalking = () => {
    if (typeof window !== 'undefined') {
      const ageConfirmed = sessionStorage.getItem('guest_age_confirmed')
      if (!ageConfirmed) {
        router.push('/age-gate')
        return
      }
    }
    router.push('/setup')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 glass-panel border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-brand-sm group-hover:shadow-brand transition-all duration-200">
              <Video className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black text-gradient tracking-tight">
              FACECHAT
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-3">
            {/* Female Pass indicator */}
            {isAuthenticated && femalePassActive && (
              <Link href="/female-pass">
                <Badge variant="purple" dot className="cursor-pointer hover:opacity-80 transition-opacity">
                  <Clock className="w-3 h-3" />
                  Female Pass · {Math.floor(femalePassMinutes / 60)}h {femalePassMinutes % 60}m
                </Badge>
              </Link>
            )}

            {/* Coin balance */}
            {isAuthenticated && (
              <CoinDisplay
                balance={balance}
                isLow={isLowBalance}
                onClick={() => router.push('/wallet')}
              />
            )}

            {/* Start Talking CTA */}
            <Button
              variant="primary"
              size="md"
              onClick={handleStartTalking}
              icon={<Video className="w-4 h-4" />}
              className="animate-glow-pulse"
            >
              Start Talking
            </Button>

            {/* Auth section */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-bg-surface2 transition-colors"
                >
                  <Avatar src={user.avatar} name={user.displayName} size="sm" />
                  <ChevronDown
                    className={`w-4 h-4 text-text-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 bg-bg-surface border border-border rounded-2xl shadow-glass overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-semibold text-text-primary truncate">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-text-muted truncate">{user.email}</p>
                      </div>

                      {[
                        { href: '/profile', icon: User, label: 'Profile' },
                        { href: '/wallet', icon: Wallet, label: 'Wallet' },
                        { href: '/settings', icon: Settings, label: 'Settings' },
                        { href: '/safety', icon: Shield, label: 'Safety' },
                      ].map(({ href, icon: Icon, label }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-text-muted hover:text-text-primary hover:bg-bg-surface2 transition-colors"
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </Link>
                      ))}

                      {user.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-brand-primary hover:bg-brand-primary/10 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          Admin Dashboard
                        </Link>
                      )}

                      <div className="border-t border-border">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-4 py-3 w-full text-sm text-status-error hover:bg-status-error/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Log Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : isGuest ? (
              <Link href="/auth/signup">
                <Button variant="secondary" size="sm">
                  Sign Up Free
                </Button>
              </Link>
            ) : (
              <Link href="/auth/login">
                <Button variant="secondary" size="sm" icon={<LogIn className="w-4 h-4" />}>
                  Log In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface2 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-bg-surface overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => { setMobileOpen(false); handleStartTalking() }}
                icon={<Video className="w-4 h-4" />}
              >
                Start Talking
              </Button>

              {isAuthenticated && (
                <CoinDisplay
                  balance={balance}
                  isLow={isLowBalance}
                  size="lg"
                  onClick={() => { setMobileOpen(false); router.push('/wallet') }}
                  className="justify-center"
                />
              )}

              <div className="flex flex-col gap-1">
                {isAuthenticated ? (
                  <>
                    {[
                      { href: '/profile', label: 'Profile' },
                      { href: '/wallet', label: 'Wallet' },
                      { href: '/settings', label: 'Settings' },
                      { href: '/safety', label: 'Safety' },
                    ].map(({ href, label }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        className="px-3 py-2.5 text-sm text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-surface2 transition-colors"
                      >
                        {label}
                      </Link>
                    ))}
                    <button
                      onClick={() => { setMobileOpen(false); handleLogout() }}
                      className="px-3 py-2.5 text-sm text-status-error hover:bg-status-error/10 rounded-lg transition-colors text-left"
                    >
                      Log Out
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Link href="/auth/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                      <Button variant="secondary" size="sm" fullWidth>Log In</Button>
                    </Link>
                    <Link href="/auth/signup" className="flex-1" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" size="sm" fullWidth>Sign Up</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
export default Navbar;
