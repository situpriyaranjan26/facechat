'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Mail } from 'lucide-react';

interface GuestExpiredModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function GuestExpiredModal({ isOpen, onClose }: GuestExpiredModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-[#111118] border border-[#2A2A3A] w-full max-w-md p-8 rounded-3xl shadow-2xl text-center">
        <div className="w-16 h-16 bg-[#7C3AED]/20 text-[#EC4899] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          Keep the conversation going.
        </h2>
        <p className="text-sm text-[#8B8BA7] mb-8 leading-relaxed">
          You've completed your 15 minutes of free guest usage! Create your free FaceChat account to continue talking and earn Face Tokens.
        </p>

        <div className="space-y-3 mb-6">
          <Link
            href="/auth/signup"
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-bold text-base flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.4)]"
          >
            <Mail className="w-5 h-5" />
            <span>Continue with Email</span>
          </Link>
        </div>

        <p className="text-xs text-[#8B8BA7]">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-white underline hover:text-[#EC4899]">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
