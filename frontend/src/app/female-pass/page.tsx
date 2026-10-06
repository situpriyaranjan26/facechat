'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Sparkles, Clock, CheckCircle2, ShieldCheck, Zap, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function PreferencePassPage() {
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [hasPass, setHasPass] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [remainingFormatted, setRemainingFormatted] = useState('0h 0m');
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    fetchPassStatus();
  }, []);

  const fetchPassStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subscriptions/preference-pass');
      setHasPass(!!res.data?.hasPass);
      setIsActive(res.data?.isActive ?? true);
      setRemainingFormatted(res.data?.formattedTime || '0h 0m');
      setRemainingSeconds(res.data?.remainingSeconds || 0);
    } catch (e: any) {
      console.error('Preference pass status error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      const newActive = !isActive;
      setIsActive(newActive);
      const res = await api.post('/subscriptions/preference-pass/toggle', { isActive: newActive });
      if (res.data?.success) {
        toast.success(`Preference matching ${newActive ? 'enabled' : 'paused'}.`);
      }
    } catch (e: any) {
      toast.error('Could not toggle preference pass state.');
    }
  };

  const handleActivate = async () => {
    setBuying(true);
    try {
      const res = await api.post('/payments/preference-pass');
      const checkoutUrl = res.data?.sessionUrl || res.data?.data?.sessionUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (err: any) {
      toast.error('Could not initiate pass checkout. Please try again.');
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8F8FF] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-16 pt-24 flex flex-col items-center">
        {/* Hero badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-purple-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-[0_0_20px_rgba(124,58,237,0.3)]">
          <Sparkles className="w-3.5 h-3.5 text-[#EC4899]" />
          <span>FaceChat Preference</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-white text-center mb-3">
          5-Hour Preference Pass
        </h1>
        <p className="text-sm text-[#8B8BA7] text-center max-w-lg mb-10 leading-relaxed">
          Filter and prioritize your preferred conversations with smart Time Banking.
        </p>

        {/* Pass Status Card */}
        <div className="w-full bg-[#111118] border border-[#2A2A3A] p-8 rounded-3xl shadow-2xl relative overflow-hidden mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#2A2A3A]">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#8B8BA7] font-semibold">
                Preference Status
              </span>
              <div className="text-2xl font-black text-white mt-1 flex items-center gap-2">
                {hasPass ? (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    Preference Active
                  </span>
                ) : (
                  <span className="text-gray-400">No Active Pass</span>
                )}
              </div>
            </div>

            {hasPass && (
              <div className="flex items-center gap-3 bg-[#1A1A26] px-4 py-2.5 rounded-2xl border border-[#2A2A3A]">
                <span className="text-xs text-[#8B8BA7] font-semibold">Preference Filter:</span>
                <button
                  onClick={handleToggle}
                  className="flex items-center gap-1.5 text-xs font-bold text-white transition hover:opacity-80"
                >
                  {isActive ? (
                    <>
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                      <span className="text-emerald-400">ON</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-6 h-6 text-gray-500" />
                      <span className="text-gray-400">PAUSED</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
            <div className="bg-[#1A1A26]/60 p-5 rounded-2xl border border-[#2A2A3A]">
              <div className="text-xs text-[#8B8BA7] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#7C3AED]" />
                <span>Banked Preference Time</span>
              </div>
              <div className="text-3xl font-black text-white">
                {hasPass ? remainingFormatted : '0h 0m'}
              </div>
              <p className="text-[11px] text-[#8B8BA7] mt-2 leading-relaxed">
                Time only counts down when you are inside an active matched call!
              </p>
            </div>

            <div className="bg-[#1A1A26]/60 p-5 rounded-2xl border border-[#2A2A3A]">
              <div className="text-xs text-[#8B8BA7] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#F59E0B]" />
                <span>Pricing &amp; Duration</span>
              </div>
              <div className="text-3xl font-black text-amber-400">
                $2.00 <span className="text-sm text-[#8B8BA7] font-normal">/ 5 Banked Hours</span>
              </div>
              <p className="text-[11px] text-[#8B8BA7] mt-2 leading-relaxed">
                Tokens (1/min) are still required for base conversation minutes.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleActivate}
              disabled={buying}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-extrabold text-base shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_40px_rgba(236,72,153,0.6)] active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5" />
              <span>{buying ? 'Starting Checkout...' : hasPass ? 'Top Up 5 More Hours — $2' : 'Get 5-Hour Preference Pass — $2'}</span>
            </button>
          </div>
        </div>

        {/* Feature List */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="p-5 rounded-2xl bg-[#111118] border border-[#2A2A3A]">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
            <h4 className="text-sm font-bold text-white mb-1">Time Banking</h4>
            <p className="text-xs text-[#8B8BA7] leading-relaxed">
              Never waste time waiting. Your 5 hours only tick down during live preferred calls.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#111118] border border-[#2A2A3A]">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
            <h4 className="text-sm font-bold text-white mb-1">Pause Any Time</h4>
            <p className="text-xs text-[#8B8BA7] leading-relaxed">
              Toggle your preference ON or OFF whenever you want to talk to anyone randomly.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#111118] border border-[#2A2A3A]">
            <ShieldCheck className="w-5 h-5 text-purple-400 mb-2" />
            <h4 className="text-sm font-bold text-white mb-1">Fair Economy</h4>
            <p className="text-xs text-[#8B8BA7] leading-relaxed">
              No hidden subscriptions or auto-renewals. Pay once, talk when you want.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
