'use client';

import React from 'react';
import { ARFilterType } from './ARFilterOverlay';
import { Sparkles, X } from 'lucide-react';

interface ARFiltersDrawerProps {
  isOpen: boolean;
  activeFilter: ARFilterType;
  onSelectFilter: (filter: ARFilterType) => void;
  onClose: () => void;
}

const FILTERS: Array<{ id: ARFilterType; label: string; icon: string; desc: string }> = [
  { id: 'none', label: 'None', icon: '🚫', desc: 'Natural video' },
  { id: 'dog', label: 'Dog Ears', icon: '🐶', desc: 'Puppy ears & tongue' },
  { id: 'rainbow', label: 'Rainbow Vomit', icon: '🌈', desc: 'Flowing rainbow waterfall' },
  { id: 'cat', label: 'Cute Kitty', icon: '🐱', desc: 'Whiskers & pink ears' },
  { id: 'shades', label: 'Thug Life', icon: '🕶️', desc: '8-Bit pixel shades & gold' },
  { id: 'crown', label: 'Royal Crown', icon: '👑', desc: 'Golden crown & jewels' },
  { id: 'flowers', label: 'Flower Crown', icon: '🌸', desc: 'Spring blossom wreath' },
  { id: 'cyberpunk', label: 'Cyber Visor', icon: '👽', desc: 'Sci-fi neon HUD matrix' },
  { id: 'sparkles', label: 'Beauty Sparkles', icon: '✨', desc: 'Angel halo & star glow' },
  { id: 'retro', label: '90s Camcorder', icon: '📼', desc: 'VHS scanlines & REC' },
];

export default function ARFiltersDrawer({
  isOpen,
  activeFilter,
  onSelectFilter,
  onClose,
}: ARFiltersDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Snapchat AR Filters
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-500/20 text-pink-300">
                  Fun Mode
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">Add interactive camera filters while talking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Carousel */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-700">
          {FILTERS.map((f) => {
            const isSelected = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onSelectFilter(f.id)}
                className={`flex-shrink-0 flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-purple-600/30 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.35)] scale-105'
                    : 'bg-zinc-800/60 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800'
                }`}
              >
                <span className="text-2xl mb-1 filter drop-shadow">{f.icon}</span>
                <span className={`text-[11px] font-semibold whitespace-nowrap ${
                  isSelected ? 'text-purple-300' : 'text-zinc-300'
                }`}>
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
