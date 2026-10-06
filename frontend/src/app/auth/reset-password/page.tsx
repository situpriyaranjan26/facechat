'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, KeyRound, ArrowLeft, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      toast.error('Please provide a valid reset token.');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match. Please re-check.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token: token.trim(),
        password,
      });

      setSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      const msg =
        err.friendlyMessage ||
        err.response?.data?.error ||
        err.message ||
        'Password reset failed. Token may be invalid or expired.';
      toast.error(msg, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-[#111118] border border-[#2A2A3A] p-8 rounded-3xl shadow-2xl">
      <Link href="/auth/login" className="inline-flex items-center gap-2 text-xs text-[#8B8BA7] hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to login</span>
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-[#7C3AED]">
          <KeyRound className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-bold text-white">Create New Password</h1>
      </div>
      <p className="text-sm text-[#8B8BA7] mb-6">
        Enter your reset token and choose a secure new password.
      </p>

      {success ? (
        <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Password Updated!</h2>
          <p className="text-xs text-[#8B8BA7]">
            Your password has been changed. Redirecting you to login...
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-bold text-sm"
          >
            Go to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8B8BA7] mb-2 uppercase">Reset Token</label>
            <div className="relative">
              <KeyRound className="w-5 h-5 text-[#8B8BA7] absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your 64-char token here"
                className="w-full bg-[#1A1A26] border border-[#2A2A3A] rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-[#7C3AED] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8B8BA7] mb-2 uppercase">New Password (8+ chars)</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-[#8B8BA7] absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1A1A26] border border-[#2A2A3A] rounded-xl pl-11 pr-11 py-3 text-white focus:outline-none focus:border-[#7C3AED]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-[#8B8BA7] hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8B8BA7] mb-2 uppercase">Confirm New Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-[#8B8BA7] absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1A1A26] border border-[#2A2A3A] rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-bold text-base hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              'Save New Password'
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8F8FF] flex flex-col items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="p-8 text-center text-[#8B8BA7]">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#7C3AED]" />
            <p>Loading password reset form...</p>
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
