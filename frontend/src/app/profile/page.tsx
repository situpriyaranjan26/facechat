'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  User,
  Star,
  Clock,
  Award,
  Zap,
  Sparkles,
  Package,
  CheckCircle,
  AlertCircle,
  DollarSign,
  ChevronRight,
  Globe,
  Gift,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Claim modal state
  const [claimMilestone, setClaimMilestone] = useState<number | null>(null);
  const [shippingName, setShippingName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCountry, setShippingCountry] = useState('United States');
  const [claiming, setClaiming] = useState(false);

  // Payout state
  const [requestingPayout, setRequestingPayout] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [uRes, sRes, cRes, lRes] = await Promise.allSettled([
        api.get('/users/profile'),
        api.get('/users/stats'),
        api.get('/creators/profile'),
        api.get('/loyalty/progress'),
      ]);

      if (uRes.status === 'fulfilled') setProfile(uRes.value.data?.user || uRes.value.data);
      if (sRes.status === 'fulfilled') setStats(sRes.value.data?.stats || sRes.value.data);
      if (cRes.status === 'fulfilled') setCreator(cRes.value.data?.profile);
      if (lRes.status === 'fulfilled') setLoyalty(lRes.value.data);
    } catch (e: any) {
      console.error('Error fetching profile', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCreator = async () => {
    try {
      const res = await api.post('/creators/apply', {
        payoutMethod: 'paypal',
        payoutDetails: user?.email || 'payout@facechat.app',
      });
      toast.success(res.data?.message || 'Creator application submitted!');
      fetchProfileData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit creator application.');
    }
  };

  const handleRequestPayout = async () => {
    setRequestingPayout(true);
    try {
      const res = await api.post('/creators/payout');
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchProfileData();
      } else {
        toast.error(res.data?.message || 'Could not request payout.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to request payout.');
    } finally {
      setRequestingPayout(false);
    }
  };

  const handleClaimReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimMilestone) return;
    setClaiming(true);
    try {
      const res = await api.post('/loyalty/claim', {
        milestoneDays: claimMilestone,
        shippingName,
        shippingAddress,
        shippingCountry,
      });
      toast.success('Reward claimed! Check your email for shipping tracking.');
      setClaimMilestone(null);
      fetchProfileData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Could not claim reward.');
    } finally {
      setClaiming(false);
    }
  };

  const verifiedHours = Number((Number(stats?.totalConversationMinutes || 0) / 60).toFixed(1));
  const starScore = Number(profile?.starRating || stats?.starRating || 5.0).toFixed(1);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8F8FF] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12 pt-24">
        {/* User Header Card */}
        <div className="bg-gradient-to-r from-[#1A1A26] to-[#111118] border border-[#2A2A3A] p-8 rounded-3xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] flex items-center justify-center text-3xl font-black text-white shadow-[0_0_30px_rgba(124,58,237,0.4)]">
              {profile?.displayName?.[0]?.toUpperCase() || user?.displayName?.[0]?.toUpperCase() || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-white">
                  {profile?.displayName || user?.displayName || 'Stranger'}
                </h1>
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{starScore}</span>
                </div>
              </div>
              <p className="text-xs text-[#8B8BA7] mt-1 flex items-center gap-2">
                <span>{profile?.email || user?.email || 'Anonymous Stranger'}</span>
                <span>&bull;</span>
                <span className="capitalize">{profile?.gender || user?.gender || 'Global'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="px-6 py-3 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-extrabold text-sm rounded-xl hover:opacity-90 transition shadow-[0_0_20px_rgba(124,58,237,0.4)]"
            >
              Start Talking
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#111118] border border-[#2A2A3A] p-5 rounded-2xl">
            <div className="text-xs text-[#8B8BA7] uppercase font-bold mb-1">FaceChat Star Rating</div>
            <div className="text-3xl font-black text-amber-400 flex items-center gap-1.5">
              <span>{starScore}</span>
              <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
            </div>
            <div className="text-[11px] text-[#8B8BA7] mt-1">Based on peer ratings</div>
          </div>

          <div className="bg-[#111118] border border-[#2A2A3A] p-5 rounded-2xl">
            <div className="text-xs text-[#8B8BA7] uppercase font-bold mb-1">Verified Talk Time</div>
            <div className="text-3xl font-black text-white">
              {verifiedHours} <span className="text-sm font-normal text-[#8B8BA7]">hrs</span>
            </div>
            <div className="text-[11px] text-[#8B8BA7] mt-1">{stats?.totalConversationMinutes || 0} total minutes</div>
          </div>

          <div className="bg-[#111118] border border-[#2A2A3A] p-5 rounded-2xl">
            <div className="text-xs text-[#8B8BA7] uppercase font-bold mb-1">People Met</div>
            <div className="text-3xl font-black text-white">
              {stats?.totalConversations || 0}
            </div>
            <div className="text-[11px] text-[#8B8BA7] mt-1">Global connections</div>
          </div>

          <div className="bg-[#111118] border border-[#2A2A3A] p-5 rounded-2xl">
            <div className="text-xs text-[#8B8BA7] uppercase font-bold mb-1">Active Streak</div>
            <div className="text-3xl font-black text-emerald-400">
              {loyalty?.progress?.consecutiveDays || stats?.conversationStreak || 0} <span className="text-sm font-normal text-[#8B8BA7]">days</span>
            </div>
            <div className="text-[11px] text-[#8B8BA7] mt-1">15m+ daily target</div>
          </div>
        </div>

        {/* Active Member & Creator Dashboard */}
        <div className="bg-[#111118] border border-[#2A2A3A] p-6 rounded-3xl mb-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#2A2A3A]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-5 h-5 text-[#EC4899]" />
                <h2 className="text-lg font-black text-white">Active Member &amp; Creator Program</h2>
              </div>
              <p className="text-xs text-[#8B8BA7]">
                750 Verified Talk Hours unlocks eligible Creator Earning ($1.00 USD / hour on preference calls).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                creator?.status === 'approved'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : creator?.status === 'pending'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-[#1A1A26] text-[#8B8BA7] border-[#2A2A3A]'
              }`}>
                {creator?.status === 'approved' ? 'Active Creator' : creator?.status === 'pending' ? 'Application Under Review' : 'Member'}
              </span>
            </div>
          </div>

          {/* Progress bar towards 750 hours */}
          <div className="mb-6">
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-white">Active Member Progress</span>
              <span className="text-[#EC4899]">{verifiedHours} / 750 Hours ({Math.min(100, Math.round((verifiedHours / 750) * 100))}%)</span>
            </div>
            <div className="w-full h-3 bg-[#1A1A26] rounded-full overflow-hidden border border-[#2A2A3A]">
              <div
                className="h-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, (verifiedHours / 750) * 100))}%` }}
              />
            </div>
          </div>

          {/* Creator Earnings & Payout card */}
          {creator?.status === 'approved' ? (
            <div className="bg-[#1A1A26]/80 p-5 rounded-2xl border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-[#8B8BA7] uppercase font-bold">Creator Earning Balance ($1/hr)</div>
                <div className="text-3xl font-black text-emerald-400 mt-1">
                  ${(Number(creator.pendingPayoutUsd) || 0).toFixed(2)} USD
                </div>
                <div className="text-[11px] text-[#8B8BA7] mt-0.5">
                  Paid out so far: ${(Number(creator.paidOutUsd) || 0).toFixed(2)} USD
                </div>
              </div>

              <button
                onClick={handleRequestPayout}
                disabled={requestingPayout || (Number(creator.pendingPayoutUsd) || 0) < 10}
                className="px-6 py-3 bg-emerald-500 text-black font-extrabold text-sm rounded-xl hover:bg-emerald-400 transition disabled:opacity-50"
              >
                {requestingPayout ? 'Processing...' : 'Request Payout (Min $10)'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#1A1A26]/40 rounded-2xl border border-[#2A2A3A]">
              <div className="text-xs text-[#8B8BA7]">
                {verifiedHours >= 750
                  ? 'Congratulations! You have achieved 750 verified conversation hours and are eligible to apply.'
                  : `Keep talking to reach 750 verified conversation hours. ${(750 - verifiedHours).toFixed(1)} hours remaining.`}
              </div>
              <button
                onClick={handleApplyCreator}
                disabled={creator?.status === 'pending' || verifiedHours < 750}
                className="px-5 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-bold text-xs rounded-xl hover:opacity-90 transition disabled:opacity-40"
              >
                {creator?.status === 'pending' ? 'Pending Approval' : 'Apply for Creator'}
              </button>
            </div>
          )}
        </div>

        {/* Loyalty Milestones Program */}
        <div className="bg-[#111118] border border-[#2A2A3A] p-6 rounded-3xl mb-8 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white">Loyalty Milestone Merchandise</h2>
          </div>
          <p className="text-xs text-[#8B8BA7] mb-6">
            Earn exclusive official FaceChat physical merchandise by maintaining your daily verified talk streak.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { days: 30, mins: 15, title: 'FaceChat Mug & Official T-Shirt' },
              { days: 50, mins: 20, title: 'FaceChat Collector Bomber Jacket' },
              { days: 250, mins: 30, title: 'FaceChat Pro Creator Gear Set' },
              { days: 450, mins: 30, title: 'Official Influencer Fast Track' },
            ].map((tier) => {
              const currentDays = Number(loyalty?.progress?.consecutiveDays || 0);
              const isEligible = currentDays >= tier.days;
              return (
                <div key={tier.days} className="p-4 rounded-2xl bg-[#1A1A26]/50 border border-[#2A2A3A] flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-amber-400">{tier.days} Days Streak ({tier.mins}m/day)</div>
                    <div className="text-sm font-extrabold text-white">{tier.title}</div>
                    <div className="text-[11px] text-[#8B8BA7] mt-0.5">{currentDays} / {tier.days} Days achieved</div>
                  </div>
                  <button
                    onClick={() => setClaimMilestone(tier.days)}
                    disabled={!isEligible}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                      isEligible
                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white hover:opacity-90'
                        : 'bg-[#111118] text-gray-500 border border-[#2A2A3A] cursor-not-allowed'
                    }`}
                  >
                    Claim Reward
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Claim Reward Modal */}
        {claimMilestone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#111118] border border-[#2A2A3A] w-full max-w-md rounded-3xl p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">Claim {claimMilestone}-Day Milestone Reward</h3>
              <p className="text-xs text-[#8B8BA7] mb-6">
                Enter your shipping address. FaceChat ships worldwide with zero shipping charges.
              </p>
              <form onSubmit={handleClaimReward} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8B8BA7] mb-1">Full Recipient Name</label>
                  <input
                    type="text"
                    required
                    value={shippingName}
                    onChange={(e) => setShippingName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-2.5 bg-[#1A1A26] border border-[#2A2A3A] rounded-xl text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8B8BA7] mb-1">Street Address, City, Postal Code</label>
                  <textarea
                    required
                    rows={3}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="123 Creator Blvd, Suite 400..."
                    className="w-full px-4 py-2.5 bg-[#1A1A26] border border-[#2A2A3A] rounded-xl text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8B8BA7] mb-1">Country</label>
                  <input
                    type="text"
                    required
                    value={shippingCountry}
                    onChange={(e) => setShippingCountry(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#1A1A26] border border-[#2A2A3A] rounded-xl text-sm text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={claiming}
                    className="flex-1 py-3 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-bold text-sm rounded-xl hover:opacity-90 transition disabled:opacity-50"
                  >
                    {claiming ? 'Confirming...' : 'Confirm Shipping'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setClaimMilestone(null)}
                    className="px-4 py-3 bg-[#1A1A26] border border-[#2A2A3A] text-[#8B8BA7] rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
