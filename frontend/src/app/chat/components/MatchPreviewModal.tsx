'use client';

import React, { useState } from 'react';
import { Check, X, Globe, Loader2, Sparkles } from 'lucide-react';
import { getCountryFlag } from '@/lib/geoUtils';

interface MatchPreviewModalProps {
  isOpen: boolean;
  partnerPhoto: string | null;
  partnerCountry: string;
  partnerName: string;
  isWaitingPartner: boolean;
  partnerAccepted: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export default function MatchPreviewModal({
  isOpen,
  partnerPhoto,
  partnerCountry,
  partnerName,
  isWaitingPartner,
  partnerAccepted,
  onAccept,
  onReject,
}: MatchPreviewModalProps) {
  if (!isOpen) return null;

  const flag = getCountryFlag(partnerCountry);
  const displayPhoto =
    partnerPhoto ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-[#111118] border-2 border-[#7C3AED]/40 p-6 rounded-3xl shadow-[0_0_60px_rgba(124,58,237,0.3)] text-center relative overflow-hidden">
        {/* Glow ambient background behind the card */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-[#7C3AED]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-[#EC4899]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#7C3AED]/20 to-[#EC4899]/20 border border-[#7C3AED]/40 text-white text-xs font-bold mb-4">
          <Sparkles className="w-3.5 h-3.5 text-[#EC4899]" />
          <span>New Match Found!</span>
        </div>

        {/* Stranger Photo Card */}
        <div className="w-56 h-64 mx-auto mb-4 rounded-2xl overflow-hidden border-2 border-[#2A2A3A] relative shadow-2xl bg-black">
          <img
            src={displayPhoto}
            alt={partnerName}
            className="w-full h-full object-cover"
          />
          {/* Country flag & label overlay */}
          <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 flex items-center justify-between text-left">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{flag}</span>
                <span>{partnerCountry}</span>
              </div>
              <div className="text-[10px] text-[#8B8BA7]">{partnerName}</div>
            </div>
            {partnerAccepted && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                Ready ✓
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-[#8B8BA7] mb-6">
          Do you want to talk with this person? Tap <strong className="text-emerald-400">✓</strong> to
          connect or <strong className="text-red-400">✕</strong> to skip (-2 Tokens).
        </p>

        {/* Tick ✓ and Cross ✕ Decision Buttons */}
        {isWaitingPartner ? (
          <div className="p-4 bg-[#1A1A26] border border-[#2A2A3A] rounded-2xl flex items-center justify-center gap-3 text-xs text-white font-semibold">
            <Loader2 className="w-4 h-4 animate-spin text-[#7C3AED]" />
            <span>Waiting for {partnerCountry} stranger to confirm...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-6">
            {/* Cross ✕ (Skip / Pass) Button */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={onReject}
                className="w-16 h-16 rounded-full bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500 text-red-400 flex items-center justify-center shadow-lg shadow-red-500/20 active:scale-95 transition"
                title="Pass / Skip (-2 Tokens)"
              >
                <X className="w-8 h-8" />
              </button>
              <span className="text-[11px] font-bold text-red-400">Pass (-2🪙)</span>
            </div>

            {/* Tick ✓ (Accept & Talk) Button */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={onAccept}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-green-400 text-black flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 transition"
                title="Accept & Talk"
              >
                <Check className="w-10 h-10 stroke-[3]" />
              </button>
              <span className="text-xs font-black text-emerald-400">Talk ✓</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
