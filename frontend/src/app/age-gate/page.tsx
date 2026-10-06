'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, CheckCircle, XCircle, User, MapPin, Sparkles, Lock, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { detectUserCountry, GeoLocationResult } from '@/lib/geoUtils';
import toast from 'react-hot-toast';

export default function AgeGatePage() {
  const router = useRouter();
  const { setGuestToken } = useAuthStore();

  const [username, setUsername] = useState('Stranger');
  const [geo, setGeo] = useState<GeoLocationResult | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(true);
  const [gender, setGender] = useState<'male' | 'female' | 'prefer_not_to_say'>('prefer_not_to_say');
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Automatically detect user country by tracking location
    detectUserCountry().then((result) => {
      setGeo(result);
      setDetectingLocation(false);
    });
  }, []);

  const handleConfirmAge = async () => {
    if (!isAgeConfirmed) {
      toast.error('Please confirm that you are at least 18 years of age.');
      return;
    }

    const detectedCountry = geo?.countryCode || 'US';
    setLoading(true);

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('facechat_age_confirmed', 'true');
        sessionStorage.setItem('facechat_username', username || 'Stranger');
        sessionStorage.setItem('facechat_country', detectedCountry);
        sessionStorage.setItem('facechat_gender', gender);
        if (geo) {
          sessionStorage.setItem('facechat_country_name', geo.countryName);
          sessionStorage.setItem('facechat_country_flag', geo.flag);
        }
      }

      // Automatically send server-detected location
      const res = await api.post('/guest/session', {
        username: username || 'Stranger',
        country: detectedCountry,
        gender,
        isAgeConfirmed: true,
      });

      if (res.data?.data?.sessionToken) {
        setGuestToken(res.data.data.sessionToken);
      }

      router.push('/setup');
    } catch (err: any) {
      console.error('Guest session creation error', err);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('facechat_age_confirmed', 'true');
      }
      router.push('/setup');
    } finally {
      setLoading(false);
    }
  };

  const handleExit = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('facechat_age_confirmed');
      window.location.href = 'https://www.google.com';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8F8FF] flex flex-col items-center justify-center p-4">
      <div className="absolute w-[400px] h-[400px] bg-[#7C3AED]/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-[#111118] border border-[#2A2A3A] p-8 rounded-3xl shadow-2xl text-left">
        <div className="text-center mb-6">
          <div className="text-2xl font-black mb-2 tracking-wider">
            FACE<span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7C3AED] to-[#EC4899]">CHAT</span>
          </div>
          <p className="text-xs text-[#8B8BA7]">Instant global random video conversations</p>
        </div>

        <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-6 h-6 text-[#EC4899]" />
        </div>

        <h1 className="text-xl font-bold text-white mb-2 text-center">
          FaceChat is for adults 18+ only
        </h1>

        <p className="text-xs text-[#8B8BA7] mb-6 text-center leading-relaxed">
          Your location is automatically detected for trusted global matchmaking. No account registration required.
        </p>

        {/* Profile fields */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-[#8B8BA7] uppercase tracking-wider mb-1.5">
              Display Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8BA7]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full pl-10 pr-4 py-3 bg-[#1A1A26] border border-[#2A2A3A] rounded-xl text-white text-sm focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>

          {/* Automatic Location Detection Display (Manual Selection Disabled) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#8B8BA7] uppercase tracking-wider">
                Country &amp; Location
              </label>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <Lock className="w-2.5 h-2.5" /> Auto-Verified
              </span>
            </div>

            <div className="w-full px-4 py-3 bg-[#1A1A26]/80 border border-[#2A2A3A] rounded-xl flex items-center justify-between">
              {detectingLocation ? (
                <div className="flex items-center gap-2 text-xs text-[#8B8BA7]">
                  <Loader2 className="w-4 h-4 text-[#7C3AED] animate-spin" />
                  <span>Tracking location automatically...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{geo?.flag}</span>
                  <div>
                    <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
                      <span>{geo?.countryName}</span>
                      <span className="text-xs text-[#8B8BA7] font-normal">({geo?.countryCode})</span>
                    </div>
                    {geo?.city && (
                      <div className="text-[10px] text-[#8B8BA7] flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-[#06B6D4]" />
                        <span>{geo.city}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                Locked
              </span>
            </div>
            <p className="text-[10px] text-[#8B8BA7]/70 mt-1">
              Location tracking prevents spoofing and keeps international matchmaking genuine.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8B8BA7] uppercase tracking-wider mb-1.5">
              Gender
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['male', 'female', 'prefer_not_to_say'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-medium border capitalize transition ${
                    gender === g
                      ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                      : 'bg-[#1A1A26] border-[#2A2A3A] text-[#8B8BA7] hover:border-[#7C3AED]/40'
                  }`}
                >
                  {g === 'prefer_not_to_say' ? 'Other / Any' : g}
                </button>
              ))}
            </div>
          </div>

          {/* 18+ Confirmation checkbox */}
          <div
            onClick={() => setIsAgeConfirmed(!isAgeConfirmed)}
            className="flex items-start gap-3 p-3 bg-[#1A1A26]/80 border border-[#2A2A3A] rounded-xl cursor-pointer hover:border-[#7C3AED]/40 transition"
          >
            <input
              type="checkbox"
              checked={isAgeConfirmed}
              onChange={(e) => setIsAgeConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-gray-600 text-[#7C3AED] focus:ring-0 cursor-pointer"
            />
            <span className="text-xs text-[#F8F8FF] leading-snug">
              I certify that I am at least 18 years old and agree to follow Community Guidelines with zero tolerance for inappropriate content.
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleConfirmAge}
            disabled={loading || detectingLocation}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.4)] disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            <span>I am 18+ &bull; Enter FaceChat</span>
          </button>

          <button
            onClick={handleExit}
            className="w-full py-3 rounded-xl bg-[#1A1A26] border border-[#2A2A3A] text-[#8B8BA7] font-semibold text-xs hover:text-white hover:bg-[#2A2A3A] transition flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            <span>Exit</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-[#8B8BA7]">
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <span>•</span>
          <Link href="/safety" className="hover:underline">Safety Information</Link>
        </div>
      </div>
    </div>
  );
}
