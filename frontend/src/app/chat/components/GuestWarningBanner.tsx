'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface GuestWarningBannerProps {
  secondsRemaining?: number;
}

export default function GuestWarningBanner({ secondsRemaining: propSeconds }: GuestWarningBannerProps) {
  const { isGuest, guestTimeRemaining, guestWarning } = useAuthStore();

  const seconds = propSeconds !== undefined ? propSeconds : guestTimeRemaining;
  const show = isGuest && (guestWarning || seconds <= 120);

  if (!show || seconds <= 0) return null;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="bg-gradient-to-r from-amber-600/90 to-amber-700/90 text-white px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between z-40 backdrop-blur shadow-md">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-200" />
        <span>
          <strong>{mins}:{secs < 10 ? '0' : ''}{secs}</strong> left before account sign-in is required.
        </span>
      </div>
      <Link
        href="/auth/signup"
        className="px-3 py-1 bg-white text-black font-bold rounded-lg text-xs hover:bg-gray-100 flex items-center gap-1 transition"
      >
        <span>Sign Up</span>
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
