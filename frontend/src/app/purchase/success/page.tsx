'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Play, Wallet } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

export default function PurchaseSuccessPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8F8FF] flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111118] border border-[#2A2A3A] p-8 rounded-3xl text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
          <p className="text-sm text-[#8B8BA7] mb-8">
            Your purchase has been verified and added to your FaceChat account.
          </p>

          <div className="space-y-3">
            <Link
              href="/chat"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-bold flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>Return to Chat</span>
            </Link>
            <Link
              href="/wallet"
              className="w-full py-4 rounded-xl bg-[#1A1A26] border border-[#2A2A3A] text-[#8B8BA7] hover:text-white font-semibold flex items-center justify-center gap-2"
            >
              <Wallet className="w-5 h-5" />
              <span>View Wallet</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
