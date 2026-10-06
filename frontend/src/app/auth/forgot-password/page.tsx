'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, KeyRound, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      if (res.data?.resetToken) {
        setResetToken(res.data.resetToken);
        toast.success('Password reset token generated!');
      } else {
        toast.success('Reset email sent if account exists.');
      }
    } catch (err: any) {
      const msg = err.friendlyMessage || err.response?.data?.error || err.message || 'Failed to submit request.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8F8FF] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111118] border border-[#2A2A3A] p-8 rounded-3xl shadow-2xl">
        <Link href="/auth/login" className="inline-flex items-center gap-2 text-xs text-[#8B8BA7] hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to login</span>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-[#7C3AED]">
            <KeyRound className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
        </div>
        <p className="text-sm text-[#8B8BA7] mb-6">
          Enter your registered email address to receive password reset instructions.
        </p>

        {submitted ? (
          <div className="space-y-4">
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300">
              <div className="flex items-center gap-2 mb-2 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Reset Request Processed</span>
              </div>
              <p className="text-xs text-[#8B8BA7]">
                If an account matches <strong>{email}</strong>, a reset token was prepared for you.
              </p>
            </div>

            {resetToken ? (
              <div className="p-4 bg-[#1A1A26] border border-[#2A2A3A] rounded-2xl space-y-3">
                <p className="text-xs text-[#8B8BA7]">
                  Instant access: You can set your new password directly below.
                </p>
                <button
                  onClick={() => router.push(`/auth/reset-password?token=${resetToken}`)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-bold text-sm hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                >
                  <span>Set New Password Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-center pt-2">
                <Link
                  href="/auth/reset-password"
                  className="text-xs text-[#EC4899] hover:underline"
                >
                  Have a reset token? Enter it here &rarr;
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8B8BA7] mb-2 uppercase">Email</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-[#8B8BA7] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
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
                  <span>Generating Link...</span>
                </>
              ) : (
                'Send Reset Instructions'
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/auth/reset-password"
                className="text-xs text-[#8B8BA7] hover:text-white transition"
              >
                Already have a reset token? Click here
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
