'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      toast.success('Reset email sent if account exists.');
    } catch {
      toast.error('Failed to submit request.');
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

        <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
        <p className="text-sm text-[#8B8BA7] mb-6">
          Enter your account email and we'll send you instructions to reset your password.
        </p>

        {submitted ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center text-sm text-emerald-400">
            Check your inbox for password reset instructions.
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
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-bold text-base hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
