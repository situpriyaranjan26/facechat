'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Mail, Lock } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.data.user);
      toast.success('Welcome back!');
      router.push('/chat');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8F8FF] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111118] border border-[#2A2A3A] p-8 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-black tracking-wider inline-block mb-3">
            FACE<span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7C3AED] to-[#EC4899]">CHAT</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Log in to FaceChat</h1>
          <p className="text-sm text-[#8B8BA7] mt-1">Pick up right where you left off</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-[#8B8BA7] uppercase">Password</label>
              <Link href="/auth/forgot-password" className="text-xs text-[#EC4899] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 text-[#8B8BA7] absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1A1A26] border border-[#2A2A3A] rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-bold text-base hover:opacity-90 transition active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-xs text-[#8B8BA7]">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-white font-semibold underline hover:text-[#EC4899]">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
