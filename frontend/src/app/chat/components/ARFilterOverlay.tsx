'use client';

import React from 'react';

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
}

export default function ARFilterOverlay({ filter, isMirrored = false }: ARFilterOverlayProps) {
  if (filter === 'none') return null;

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden z-20 ${
        isMirrored ? 'scale-x-[-1]' : ''
      }`}
    >
      {/* 1. 🐶 DOG FILTER */}
      {filter === 'dog' && (
        <div className="relative w-full h-full flex flex-col items-center justify-start">
          {/* Top Floppy Dog Ears */}
          <div className="absolute top-2 w-full max-w-[420px] flex justify-between px-6">
            {/* Left Ear */}
            <div className="w-20 h-32 bg-amber-800 rounded-b-full border-4 border-amber-950 shadow-lg transform -rotate-12 origin-top animate-bounce">
              <div className="w-12 h-24 bg-amber-600 rounded-b-full mx-auto mt-2" />
            </div>
            {/* Right Ear */}
            <div className="w-20 h-32 bg-amber-800 rounded-b-full border-4 border-amber-950 shadow-lg transform rotate-12 origin-top animate-bounce">
              <div className="w-12 h-24 bg-amber-600 rounded-b-full mx-auto mt-2" />
            </div>
          </div>

          {/* Dog Nose & Whiskers in Center-Mid */}
          <div className="absolute top-[48%] flex flex-col items-center">
            {/* Snout */}
            <div className="w-14 h-10 bg-zinc-900 rounded-full flex items-center justify-center border-2 border-zinc-700 shadow-md">
              <div className="w-4 h-2 bg-zinc-500 rounded-full mb-2" />
            </div>
            {/* Cute Puppy Tongue */}
            <div className="w-10 h-14 bg-pink-400 rounded-b-full border-2 border-pink-600 -mt-1 shadow-sm animate-pulse" />
          </div>

          {/* Rosy Puppy Cheeks */}
          <div className="absolute top-[49%] w-full max-w-[280px] flex justify-between px-4">
            <div className="w-8 h-8 rounded-full bg-pink-500/40 blur-[2px]" />
            <div className="w-8 h-8 rounded-full bg-pink-500/40 blur-[2px]" />
          </div>
        </div>
      )}

      {/* 2. 🌈 RAINBOW VOMIT / AURA */}
      {filter === 'rainbow' && (
        <div className="relative w-full h-full flex flex-col items-center justify-end">
          {/* Pulsing rainbow aura around border */}
          <div className="absolute inset-0 border-8 border-transparent animate-pulse rounded-2xl bg-gradient-to-r from-red-500/20 via-yellow-500/20 via-green-500/20 via-cyan-500/20 to-purple-500/20 mix-blend-screen pointer-events-none" />

          {/* Cascading Rainbow Waterfall streaming from chin */}
          <div className="absolute top-[55%] bottom-0 w-36 flex justify-center overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-red-500 via-orange-400 via-yellow-400 via-green-400 via-blue-500 via-indigo-500 to-purple-600 opacity-95 shadow-[0_0_25px_rgba(255,255,255,0.8)] animate-pulse rounded-t-full flex justify-around">
              <div className="w-1 bg-white/40 h-full animate-bounce" />
              <div className="w-1 bg-white/40 h-full animate-pulse" />
              <div className="w-1 bg-white/40 h-full animate-bounce" />
            </div>
          </div>

          {/* Rainbow Sparkles */}
          <div className="absolute top-10 right-12 text-3xl animate-spin">✨</div>
          <div className="absolute top-20 left-12 text-3xl animate-bounce">🌈</div>
        </div>
      )}

      {/* 3. 🐱 CUTE CAT FILTER */}
      {filter === 'cat' && (
        <div className="relative w-full h-full flex flex-col items-center justify-start">
          {/* Cat Ears */}
          <div className="absolute top-2 w-full max-w-[380px] flex justify-between px-8">
            {/* Left Ear */}
            <div className="w-0 h-0 border-l-[35px] border-l-transparent border-r-[35px] border-r-transparent border-b-[60px] border-b-zinc-800 relative transform -rotate-12">
              <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[38px] border-b-pink-400 absolute -left-[20px] top-[14px]" />
            </div>
            {/* Right Ear */}
            <div className="w-0 h-0 border-l-[35px] border-l-transparent border-r-[35px] border-r-transparent border-b-[60px] border-b-zinc-800 relative transform rotate-12">
              <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[38px] border-b-pink-400 absolute -left-[20px] top-[14px]" />
            </div>
          </div>

          {/* Cat Nose & Whiskers */}
          <div className="absolute top-[48%] flex flex-col items-center">
            {/* Nose */}
            <div className="w-6 h-5 bg-pink-400 rounded-b-lg border border-pink-500 shadow-sm" />
            {/* Mouth */}
            <div className="text-pink-300 text-sm font-bold -mt-1 font-mono">3</div>
          </div>

          {/* Whiskers */}
          <div className="absolute top-[49%] w-full max-w-[340px] flex justify-between px-2">
            <div className="flex flex-col gap-2 transform -rotate-6">
              <div className="w-14 h-0.5 bg-zinc-200/90 shadow-sm" />
              <div className="w-16 h-0.5 bg-zinc-200/90 shadow-sm" />
              <div className="w-12 h-0.5 bg-zinc-200/90 shadow-sm" />
            </div>
            <div className="flex flex-col gap-2 transform rotate-6">
              <div className="w-14 h-0.5 bg-zinc-200/90 shadow-sm" />
              <div className="w-16 h-0.5 bg-zinc-200/90 shadow-sm" />
              <div className="w-12 h-0.5 bg-zinc-200/90 shadow-sm" />
            </div>
          </div>
        </div>
      )}

      {/* 4. 🕶️ THUG LIFE / 8-BIT SHADES */}
      {filter === 'shades' && (
        <div className="relative w-full h-full flex flex-col items-center justify-start">
          {/* Shades on eyes */}
          <div className="absolute top-[38%] flex items-center justify-center animate-pulse">
            <div className="flex items-center">
              {/* Left Lens */}
              <div className="w-24 h-12 bg-black border-4 border-zinc-200 shadow-[0_0_15px_rgba(0,0,0,0.9)] flex items-center justify-start px-2">
                <div className="w-4 h-4 bg-white/70" />
              </div>
              {/* Bridge */}
              <div className="w-6 h-3 bg-black border-t-4 border-zinc-200" />
              {/* Right Lens */}
              <div className="w-24 h-12 bg-black border-4 border-zinc-200 shadow-[0_0_15px_rgba(0,0,0,0.9)] flex items-center justify-start px-2">
                <div className="w-4 h-4 bg-white/70" />
              </div>
            </div>
          </div>

          {/* Gold Dollar Chain at bottom */}
          <div className="absolute bottom-6 flex flex-col items-center">
            <div className="w-36 h-8 border-b-8 border-amber-400 rounded-b-full shadow-lg" />
            <div className="w-12 h-12 rounded-full bg-amber-400 border-2 border-amber-600 flex items-center justify-center font-black text-amber-950 text-xl shadow-xl -mt-2">
              $
            </div>
          </div>
        </div>
      )}

      {/* 5. 👑 ROYAL CROWN */}
      {filter === 'crown' && (
        <div className="relative w-full h-full flex flex-col items-center justify-start">
          {/* Gold Crown */}
          <div className="absolute top-4 flex flex-col items-center animate-bounce">
            <svg
              className="w-32 h-24 filter drop-shadow-[0_0_12px_rgba(245,158,11,0.9)]"
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
              {/* Jewels */}
              <circle cx="50" cy="15" r="5" fill="#EF4444" stroke="#991B1B" strokeWidth="1" />
              <circle cx="20" cy="25" r="4" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1" />
              <circle cx="80" cy="25" r="4" fill="#10B981" stroke="#047857" strokeWidth="1" />
              <circle cx="50" cy="50" r="4" fill="#EC4899" stroke="#BE185D" strokeWidth="1" />
            </svg>
            <div className="text-yellow-300 text-xs font-black tracking-widest uppercase drop-shadow -mt-1">
              ✨ ROYALTY ✨
            </div>
          </div>
        </div>
      )}

      {/* 6. 🌸 FLOWER CROWN */}
      {filter === 'flowers' && (
        <div className="relative w-full h-full flex flex-col items-center justify-start">
          <div className="absolute top-6 w-full max-w-[340px] flex items-center justify-center gap-2">
            <div className="text-3xl animate-pulse">🌸</div>
            <div className="text-4xl animate-bounce">🌺</div>
            <div className="text-4xl">🌼</div>
            <div className="text-4xl animate-bounce">🌺</div>
            <div className="text-3xl animate-pulse">🌸</div>
          </div>
          {/* Floating Petals */}
          <div className="absolute top-24 left-10 text-xl animate-pulse">🍃</div>
          <div className="absolute top-28 right-10 text-xl animate-pulse">✨</div>
        </div>
      )}

      {/* 7. 👽 CYBERPUNK NEON MATRIX */}
      {filter === 'cyberpunk' && (
        <div className="relative w-full h-full flex flex-col items-center justify-start">
          {/* Cyber Visor over eyes */}
          <div className="absolute top-[38%] w-full max-w-[360px] h-14 bg-cyan-500/20 border-y-2 border-cyan-400 backdrop-blur-[1px] shadow-[0_0_20px_rgba(6,182,212,0.8)] flex items-center justify-between px-4">
            <span className="text-[10px] font-mono text-cyan-300 font-bold animate-pulse">
              SYS::LOCK [98.4%]
            </span>
            <div className="w-8 h-8 border border-pink-500 rounded-full animate-ping" />
            <span className="text-[10px] font-mono text-pink-400 font-bold animate-pulse">
              HUD::LIVE
            </span>
          </div>
          {/* Holographic Target Reticle */}
          <div className="absolute top-[36%] w-20 h-20 border border-cyan-400/60 rounded-full flex items-center justify-center animate-spin">
            <div className="w-2 h-2 bg-pink-500 rounded-full" />
          </div>
        </div>
      )}

      {/* 8. ✨ BEAUTY SPARKLES & HALO */}
      {filter === 'sparkles' && (
        <div className="relative w-full h-full flex flex-col items-center justify-start">
          {/* Angel Halo Ring */}
          <div className="absolute top-3 w-40 h-8 border-4 border-amber-300 rounded-[100%] shadow-[0_0_20px_rgba(252,211,77,0.9)] animate-bounce" />

          {/* Shimmering Star Sparkles */}
          <div className="absolute top-16 left-16 text-3xl text-yellow-300 animate-spin">✦</div>
          <div className="absolute top-28 right-20 text-4xl text-amber-200 animate-pulse">✨</div>
          <div className="absolute top-44 left-12 text-2xl text-pink-300 animate-bounce">✦</div>
          <div className="absolute bottom-20 right-14 text-3xl text-yellow-200 animate-spin">✨</div>
        </div>
      )}

      {/* 9. 📼 RETRO VHS 1990s */}
      {filter === 'retro' && (
        <div className="relative w-full h-full p-4 flex flex-col justify-between font-mono select-none">
          {/* Top Info */}
          <div className="flex items-center justify-between text-red-500 font-bold text-sm tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
              <span>REC</span>
            </div>
            <div className="text-zinc-300 text-xs font-semibold">SP 0:02:14</div>
          </div>

          {/* Scanline Vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent pointer-events-none opacity-40 animate-pulse" />

          {/* Bottom VHS Timestamp */}
          <div className="flex items-center justify-between text-yellow-300 text-xs font-bold drop-shadow">
            <span>AUTO TRACKING</span>
            <span>OCT. 06 1998</span>
          </div>
        </div>
      )}
    </div>
  );
}
