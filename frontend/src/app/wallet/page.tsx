'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingCart,
  Sparkles,
  Zap,
  Clock,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

interface TokenBundle {
  type: string;
  tokens: number;
  priceUsd: number;
  label: string;
  popular?: boolean;
}

const BUNDLES: TokenBundle[] = [
  { type: 'standard', tokens: 1000, priceUsd: 4.0, label: '1,000 Face Tokens' },
  { type: 'popular', tokens: 2500, priceUsd: 9.0, label: '2,500 Face Tokens', popular: true },
  { type: 'mega', tokens: 6000, priceUsd: 20.0, label: '6,000 Face Tokens' },
];

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingType, setBuyingType] = useState<string | null>(null);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const [balRes, txRes] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/wallet/transactions'),
      ]);
      setBalance(balRes.data?.data?.balance ?? balRes.data?.balance ?? 0);
      setTransactions(txRes.data?.data?.transactions ?? txRes.data?.transactions ?? []);
    } catch (e: any) {
      console.error('Wallet fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyBundle = async (bundleType: string) => {
    setBuyingType(bundleType);
    try {
      const res = await api.post('/payments/token-purchase', { bundleType });
      const checkoutUrl = res.data?.sessionUrl || res.data?.data?.sessionUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (err: any) {
      toast.error('Payment checkout failed. Please try again.');
    } finally {
      setBuyingType(null);
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'CONVERSATION_REWARD':
      case 'EARN':
        return { label: 'Call Reward', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'CONVERSATION_SPEND':
      case 'SPEND':
        return { label: 'Talk Time', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'SKIP_PENALTY':
        return { label: 'Skip Penalty', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'PURCHASE':
        return { label: 'Purchase', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
      case 'BONUS':
        return { label: 'Welcome Bonus', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
      default:
        return { label: type, color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' };
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8F8FF] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12 pt-24">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-1">Face Tokens Wallet</h1>
            <p className="text-xs text-[#8B8BA7]">
              The core conversation economy of FaceChat &bull; 1 Token / Minute Base Talk Time
            </p>
          </div>
          <Link
            href="/female-pass"
            className="self-start md:self-auto px-4 py-2 bg-[#1A1A26] border border-[#2A2A3A] text-purple-300 font-semibold rounded-xl text-xs hover:bg-[#2A2A3A] flex items-center gap-2 transition"
          >
            <Sparkles className="w-4 h-4 text-[#EC4899]" />
            <span>FaceChat Preference Pass ($2 / 5h)</span>
          </Link>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-r from-[#1A1A26] to-[#111118] border border-[#2A2A3A] p-8 rounded-3xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
          <div className="z-10">
            <span className="text-xs uppercase tracking-wider text-[#8B8BA7] font-bold">
              Current Available Balance
            </span>
            <div className="text-5xl font-black text-amber-400 flex items-center gap-3 mt-2">
              <span>🪙</span>
              <span>{balance.toLocaleString()}</span>
              <span className="text-lg text-white font-semibold">Face Tokens</span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-[#8B8BA7]">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" /> +5 tokens for talks &gt;2m
              </span>
              <span>&bull;</span>
              <span>1 token/min usage</span>
              <span>&bull;</span>
              <span className="text-amber-400">-2 tokens on fast skip</span>
            </div>
          </div>
        </div>

        {/* Token Refill Products */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <span>Refill Face Tokens</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BUNDLES.map((bundle) => (
              <div
                key={bundle.type}
                className={`p-6 rounded-3xl border transition flex flex-col justify-between relative ${
                  bundle.popular
                    ? 'bg-gradient-to-b from-[#1A1A26] to-[#111118] border-[#7C3AED] shadow-[0_0_30px_rgba(124,58,237,0.2)]'
                    : 'bg-[#111118] border-[#2A2A3A] hover:border-gray-700'
                }`}
              >
                {bundle.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="text-xs font-bold text-[#8B8BA7] uppercase tracking-wider mb-2">
                    {bundle.label}
                  </div>
                  <div className="text-3xl font-black text-white mb-1">
                    🪙 {bundle.tokens.toLocaleString()}
                  </div>
                  <p className="text-xs text-[#8B8BA7] mb-6">
                    {bundle.tokens} minutes of talking time
                  </p>
                </div>

                <div>
                  <div className="text-xl font-extrabold text-amber-400 mb-4">
                    ${bundle.priceUsd.toFixed(2)} USD
                  </div>
                  <button
                    onClick={() => handleBuyBundle(bundle.type)}
                    disabled={buyingType !== null}
                    className="w-full py-3 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-extrabold text-sm rounded-xl hover:opacity-90 active:scale-[0.98] transition shadow-[0_0_20px_rgba(124,58,237,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>{buyingType === bundle.type ? 'Processing...' : 'Purchase'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-[#111118] border border-[#2A2A3A] rounded-3xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4">Face Tokens Ledger</h2>

          {loading ? (
            <div className="text-center py-12 text-[#8B8BA7]">Loading ledger...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-[#8B8BA7] text-sm">
              No transactions yet. Start talking to earn tokens!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A3A] text-xs text-[#8B8BA7] uppercase">
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Balance After</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A3A]/40 text-xs">
                  {transactions.map((tx: any) => {
                    const badge = getTransactionBadge(tx.transactionType || tx.transaction_type);
                    const isPositive = tx.amount > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-[#1A1A26]/50 transition">
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className={`py-3 px-4 font-extrabold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isPositive ? `+${tx.amount}` : tx.amount}
                        </td>
                        <td className="py-3 px-4 text-[#8B8BA7]">
                          {tx.description}
                        </td>
                        <td className="py-3 px-4 text-white font-mono">
                          {tx.balanceAfter ?? tx.balance_after}
                        </td>
                        <td className="py-3 px-4 text-[#8B8BA7]">
                          {new Date(tx.createdAt || tx.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
