'use client';

import React from 'react';
import Link from 'next/link';
import { XCircle, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

export default function PurchaseCancelPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8F8FF] flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111118] border border-[#2A2A3A] p-8 rounded-3xl text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Payment Cancelled</h1>
          <p className="text-sm text-[#8B8BA7] mb-8">
            No charges were made to your account.
          </p>

          <Link
            href="/wallet"
            className="w-full py-4 rounded-xl bg-[#1A1A26] border border-[#2A2A3A] text-white font-semibold flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Wallet</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
