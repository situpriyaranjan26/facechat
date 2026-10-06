'use client';

import React from 'react';
import { useFaceTracker } from '@/lib/useFaceTracker';

export type ARFilterType =
  | 'none'
  | 'dog'
  | 'rainbow'
  | 'cat'
  | 'shades'
  | 'crown'
  | 'flowers'
  | 'cyberpunk'
  | 'sparkles'
  | 'retro';

interface ARFilterOverlayProps {
  filter: ARFilterType;
  isMirrored?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement> | null;
}

export default function ARFilterOverlay({
  filter,
  isMirrored = false,
  videoRef = null,
}: ARFilterOverlayProps) {
  const face = useFaceTracker(videoRef);

  if (filter === 'none') return null;

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden z-20 ${
        isMirrored ? 'scale-x-[-1]' : ''
      }`}
    >
      {/* Real-time Face Tracking Status Indicator */}
      {face.isDetected && (
        <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur border border-emerald-500/40 text-[9px] font-mono text-emerald-400 select-none animate-in fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>Face Tracked</span>
        </div>
      )}

      {/* 1. 🐶 DOG FILTER (Dynamically Anchored to Forehead, Nose & Mouth) */}
      {filter === 'dog' && (
        <>
          {/* Floppy Dog Ears (Anchored above Forehead) */}
          <div
            className="absolute transition-all duration-75 flex justify-between"
            style={{
              top: `${Math.max(-5, face.y - face.height * 0.28)}%`,
              left: `${face.x}%`,
              width: `${Math.max(120, face.width * 1.3)}%`,
              transform: `translate(-50%, 0) rotate(${face.tiltDeg}deg)`,
            }}
          >
            {/* Left Ear */}
            <div className="w-14 h-24 sm:w-20 sm:h-32 bg-amber-800 rounded-b-full border-4 border-amber-950 shadow-xl transform -rotate-12 origin-top animate-bounce">
              <div className="w-8 h-18 sm:w-12 sm:h-24 bg-amber-600 rounded-b-full mx-auto mt-2" />
            </div>
            {/* Right Ear */}
            <div className="w-14 h-24 sm:w-20 sm:h-32 bg-amber-800 rounded-b-full border-4 border-amber-950 shadow-xl transform rotate-12 origin-top animate-bounce">
              <div className="w-8 h-18 sm:w-12 sm:h-24 bg-amber-600 rounded-b-full mx-auto mt-2" />
            </div>
          </div>

          {/* Dog Snout & Tongue (Anchored at Nose & Mouth) */}
          <div
            className="absolute transition-all duration-75 flex flex-col items-center"
            style={{
              top: `${face.y + face.height * (face.noseY / 100)}%`,
              left: `${face.x}%`,
              transform: `translate(-50%, -40%) rotate(${face.tiltDeg}deg)`,
            }}
          >
            <div className="w-11 h-8 sm:w-14 sm:h-10 bg-zinc-900 rounded-full flex items-center justify-center border-2 border-zinc-700 shadow-md">
              <div className="w-3.5 h-1.5 sm:w-4 sm:h-2 bg-zinc-500 rounded-full mb-1" />
            </div>
            <div className="w-8 h-12 sm:w-10 sm:h-14 bg-pink-400 rounded-b-full border-2 border-pink-600 -mt-1 shadow-sm animate-pulse" />
          </div>

          {/* Rosy Cheeks */}
          <div
            className="absolute transition-all duration-75 flex justify-between px-2"
            style={{
              top: `${face.y + face.height * (face.noseY / 100)}%`,
              left: `${face.x}%`,
              width: `${face.width * 0.95}%`,
              transform: `translate(-50%, 0) rotate(${face.tiltDeg}deg)`,
            }}
          >
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-pink-500/40 blur-[2px]" />
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-pink-500/40 blur-[2px]" />
          </div>
        </>
      )}

      {/* 2. 🌈 RAINBOW VOMIT / AURA (Anchored to Mouth / Chin) */}
      {filter === 'rainbow' && (
        <>
          <div className="absolute inset-0 border-8 border-transparent animate-pulse rounded-2xl bg-gradient-to-r from-red-500/20 via-yellow-500/20 via-green-500/20 via-cyan-500/20 to-purple-500/20 mix-blend-screen pointer-events-none" />
          <div
            className="absolute bottom-0 transition-all duration-75 flex justify-center overflow-hidden"
            style={{
              top: `${face.y + face.height * (face.mouthY / 100)}%`,
              left: `${face.x}%`,
              width: `${Math.max(70, face.width * 0.65)}%`,
              transform: 'translate(-50%, 0)',
            }}
          >
            <div className="w-full h-full bg-gradient-to-r from-red-500 via-orange-400 via-yellow-400 via-green-400 via-blue-500 via-indigo-500 to-purple-600 opacity-95 shadow-[0_0_25px_rgba(255,255,255,0.8)] animate-pulse rounded-t-full flex justify-around">
              <div className="w-1 bg-white/40 h-full animate-bounce" />
              <div className="w-1 bg-white/40 h-full animate-pulse" />
              <div className="w-1 bg-white/40 h-full animate-bounce" />
            </div>
          </div>
          <div className="absolute top-10 right-8 text-2xl sm:text-3xl animate-spin">✨</div>
          <div className="absolute top-16 left-8 text-2xl sm:text-3xl animate-bounce">🌈</div>
        </>
      )}

      {/* 3. 🐱 CUTE CAT FILTER (Anchored to Forehead & Cheeks) */}
      {filter === 'cat' && (
        <>
          {/* Cat Ears */}
          <div
            className="absolute transition-all duration-75 flex justify-between"
            style={{
              top: `${Math.max(-5, face.y - face.height * 0.32)}%`,
              left: `${face.x}%`,
              width: `${Math.max(110, face.width * 1.2)}%`,
              transform: `translate(-50%, 0) rotate(${face.tiltDeg}deg)`,
            }}
          >
            {/* Left Ear */}
            <div className="w-0 h-0 border-l-[28px] sm:border-l-[35px] border-l-transparent border-r-[28px] sm:border-r-[35px] border-r-transparent border-b-[50px] sm:border-b-[60px] border-b-zinc-800 relative transform -rotate-12">
              <div className="w-0 h-0 border-l-[16px] sm:border-l-[20px] border-l-transparent border-r-[16px] sm:border-r-[20px] border-r-transparent border-b-[32px] sm:border-b-[38px] border-b-pink-400 absolute -left-[16px] sm:-left-[20px] top-[12px] sm:top-[14px]" />
            </div>
            {/* Right Ear */}
            <div className="w-0 h-0 border-l-[28px] sm:border-l-[35px] border-l-transparent border-r-[28px] sm:border-r-[35px] border-r-transparent border-b-[50px] sm:border-b-[60px] border-b-zinc-800 relative transform rotate-12">
              <div className="w-0 h-0 border-l-[16px] sm:border-l-[20px] border-l-transparent border-r-[16px] sm:border-r-[20px] border-r-transparent border-b-[32px] sm:border-b-[38px] border-b-pink-400 absolute -left-[16px] sm:-left-[20px] top-[12px] sm:top-[14px]" />
            </div>
          </div>

          {/* Cat Nose & Whiskers */}
          <div
            className="absolute transition-all duration-75 flex flex-col items-center"
            style={{
              top: `${face.y + face.height * (face.noseY / 100)}%`,
              left: `${face.x}%`,
              transform: `translate(-50%, -25%) rotate(${face.tiltDeg}deg)`,
            }}
          >
            <div className="w-5 h-4 sm:w-6 sm:h-5 bg-pink-400 rounded-b-lg border border-pink-500 shadow-sm" />
            <div className="text-pink-300 text-xs sm:text-sm font-bold -mt-1 font-mono">3</div>
          </div>

          {/* Whiskers */}
          <div
            className="absolute transition-all duration-75 flex justify-between"
            style={{
              top: `${face.y + face.height * (face.noseY / 100)}%`,
              left: `${face.x}%`,
              width: `${Math.max(120, face.width * 1.3)}%`,
              transform: `translate(-50%, 0) rotate(${face.tiltDeg}deg)`,
            }}
          >
            <div className="flex flex-col gap-1.5 transform -rotate-6">
              <div className="w-10 sm:w-14 h-0.5 bg-zinc-200/90 shadow-sm" />
              <div className="w-12 sm:w-16 h-0.5 bg-zinc-200/90 shadow-sm" />
              <div className="w-9 sm:w-12 h-0.5 bg-zinc-200/90 shadow-sm" />
            </div>
            <div className="flex flex-col gap-1.5 transform rotate-6">
              <div className="w-10 sm:w-14 h-0.5 bg-zinc-200/90 shadow-sm" />
              <div className="w-12 sm:w-16 h-0.5 bg-zinc-200/90 shadow-sm" />
              <div className="w-9 sm:w-12 h-0.5 bg-zinc-200/90 shadow-sm" />
            </div>
          </div>
        </>
      )}

      {/* 4. 🕶️ THUG LIFE / 8-BIT SHADES (Anchored directly over Eyes) */}
      {filter === 'shades' && (
        <>
          <div
            className="absolute transition-all duration-75 flex items-center justify-center"
            style={{
              top: `${face.y + face.height * (face.eyeY / 100)}%`,
              left: `${face.x}%`,
              width: `${Math.max(90, face.width * 0.95)}%`,
              transform: `translate(-50%, -50%) rotate(${face.tiltDeg}deg)`,
            }}
          >
            <div className="flex items-center w-full justify-center">
              {/* Left Lens */}
              <div className="w-1/2 h-8 sm:h-12 bg-black border-4 border-zinc-200 shadow-[0_0_15px_rgba(0,0,0,0.9)] flex items-center justify-start px-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white/70" />
              </div>
              {/* Bridge */}
              <div className="w-3 sm:w-6 h-2 sm:h-3 bg-black border-t-4 border-zinc-200" />
              {/* Right Lens */}
              <div className="w-1/2 h-8 sm:h-12 bg-black border-4 border-zinc-200 shadow-[0_0_15px_rgba(0,0,0,0.9)] flex items-center justify-start px-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white/70" />
              </div>
            </div>
          </div>

          {/* Gold Dollar Chain */}
          <div
            className="absolute transition-all duration-75 flex flex-col items-center"
            style={{
              top: `${face.y + face.height * 0.85}%`,
              left: `${face.x}%`,
              transform: `translate(-50%, 0) rotate(${face.tiltDeg * 0.5}deg)`,
            }}
          >
            <div className="w-28 sm:w-36 h-6 sm:h-8 border-b-8 border-amber-400 rounded-b-full shadow-lg" />
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-amber-400 border-2 border-amber-600 flex items-center justify-center font-black text-amber-950 text-base sm:text-xl shadow-xl -mt-2">
              $
            </div>
          </div>
        </>
      )}

      {/* 5. 👑 ROYAL CROWN (Anchored on Top of Head) */}
      {filter === 'crown' && (
        <div
          className="absolute transition-all duration-75 flex flex-col items-center animate-bounce"
          style={{
            top: `${Math.max(-8, face.y - face.height * 0.42)}%`,
            left: `${face.x}%`,
            width: `${Math.max(90, face.width * 0.85)}%`,
            transform: `translate(-50%, 0) rotate(${face.tiltDeg}deg)`,
          }}
        >
          <svg
            className="w-24 h-18 sm:w-32 sm:h-24 filter drop-shadow-[0_0_12px_rgba(245,158,11,0.9)]"
            viewBox="0 0 100 70"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <polygon
              points="10,60 20,20 40,45 50,10 60,45 80,20 90,60"
              fill="#F59E0B"
              stroke="#B45309"
              strokeWidth="3"
            />
            <circle cx="50" cy="15" r="5" fill="#EF4444" stroke="#991B1B" strokeWidth="1" />
            <circle cx="20" cy="25" r="4" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1" />
            <circle cx="80" cy="25" r="4" fill="#10B981" stroke="#047857" strokeWidth="1" />
            <circle cx="50" cy="50" r="4" fill="#EC4899" stroke="#BE185D" strokeWidth="1" />
          </svg>
          <div className="text-yellow-300 text-[10px] sm:text-xs font-black tracking-widest uppercase drop-shadow -mt-1">
            ✨ ROYALTY ✨
          </div>
        </div>
      )}

      {/* 6. 🌸 FLOWER CROWN (Anchored along Forehead) */}
      {filter === 'flowers' && (
        <div
          className="absolute transition-all duration-75 flex items-center justify-center gap-1.5"
          style={{
            top: `${Math.max(-4, face.y - face.height * 0.22)}%`,
            left: `${face.x}%`,
            width: `${Math.max(100, face.width * 1.15)}%`,
            transform: `translate(-50%, 0) rotate(${face.tiltDeg}deg)`,
          }}
        >
          <div className="text-2xl sm:text-3xl animate-pulse">🌸</div>
          <div className="text-3xl sm:text-4xl animate-bounce">🌺</div>
          <div className="text-3xl sm:text-4xl">🌼</div>
          <div className="text-3xl sm:text-4xl animate-bounce">🌺</div>
          <div className="text-2xl sm:text-3xl animate-pulse">🌸</div>
        </div>
      )}

      {/* 7. 👽 CYBERPUNK NEON MATRIX (Anchored across Eyes) */}
      {filter === 'cyberpunk' && (
        <div
          className="absolute transition-all duration-75 flex items-center justify-center"
          style={{
            top: `${face.y + face.height * (face.eyeY / 100)}%`,
            left: `${face.x}%`,
            width: `${Math.max(110, face.width * 1.15)}%`,
            transform: `translate(-50%, -50%) rotate(${face.tiltDeg}deg)`,
          }}
        >
          <div className="w-full h-10 sm:h-14 bg-cyan-500/20 border-y-2 border-cyan-400 backdrop-blur-[1px] shadow-[0_0_20px_rgba(6,182,212,0.8)] flex items-center justify-between px-3">
            <span className="text-[9px] sm:text-[10px] font-mono text-cyan-300 font-bold animate-pulse">
              LOCK::TARGET
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 border border-pink-500 rounded-full animate-ping" />
            <span className="text-[9px] sm:text-[10px] font-mono text-pink-400 font-bold animate-pulse">
              HUD::99%
            </span>
          </div>
        </div>
      )}

      {/* 8. ✨ BEAUTY SPARKLES & HALO (Anchored above Head) */}
      {filter === 'sparkles' && (
        <>
          <div
            className="absolute transition-all duration-75 flex flex-col items-center"
            style={{
              top: `${Math.max(-8, face.y - face.height * 0.38)}%`,
              left: `${face.x}%`,
              transform: `translate(-50%, 0) rotate(${face.tiltDeg}deg)`,
            }}
          >
            <div className="w-28 sm:w-40 h-6 sm:h-8 border-4 border-amber-300 rounded-[100%] shadow-[0_0_20px_rgba(252,211,77,0.9)] animate-bounce" />
          </div>
          <div className="absolute top-12 left-10 text-2xl sm:text-3xl text-yellow-300 animate-spin">✦</div>
          <div className="absolute top-20 right-10 text-3xl sm:text-4xl text-amber-200 animate-pulse">✨</div>
          <div className="absolute bottom-16 right-8 text-2xl sm:text-3xl text-yellow-200 animate-spin">✨</div>
        </>
      )}

      {/* 9. 📼 RETRO VHS 1990s */}
      {filter === 'retro' && (
        <div className="relative w-full h-full p-3 sm:p-4 flex flex-col justify-between font-mono select-none">
          <div className="flex items-center justify-between text-red-500 font-bold text-xs sm:text-sm tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <span>REC</span>
            </div>
            <div className="text-zinc-300 text-[11px] font-semibold">SP 0:02:14</div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent pointer-events-none opacity-40 animate-pulse" />
          <div className="flex items-center justify-between text-yellow-300 text-[10px] sm:text-xs font-bold drop-shadow">
            <span>AUTO TRACKING</span>
            <span>OCT. 06 1998</span>
          </div>
        </div>
      )}
    </div>
  );
}
