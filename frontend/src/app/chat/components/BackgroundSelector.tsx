'use client';

import React from 'react';
import { Palette, Check, Sparkles, X } from 'lucide-react';

export type BackgroundPreset = 'none' | 'blur' | 'studio' | 'cyberpunk' | 'sunset' | 'cozy';

interface BackgroundSelectorProps {
  isOpen: boolean;
  activePreset: BackgroundPreset;
  onSelect: (preset: BackgroundPreset) => void;
  onClose: () => void;
}

const PRESETS: Array<{
  id: BackgroundPreset;
  name: string;
  icon: string;
  gradient: string;
  description: string;
}> = [
  {
    id: 'none',
    name: 'Normal',
    icon: '📷',
    gradient: 'from-gray-800 to-gray-900',
    description: 'Natural webcam background',
  },
  {
    id: 'blur',
    name: 'Bokeh Blur',
    icon: '🌫️',
    gradient: 'from-slate-700 to-slate-900',
    description: 'Depth-of-field privacy blur',
  },
  {
    id: 'studio',
    name: 'Dark Studio',
    icon: '🎬',
    gradient: 'from-zinc-900 via-neutral-900 to-black',
    description: 'Clean cinematic studio vignette',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    icon: '🌆',
    gradient: 'from-violet-900 via-purple-900 to-cyan-900',
    description: 'Electric neon glow',
  },
  {
    id: 'sunset',
    name: 'Golden Sunset',
    icon: '🌅',
    gradient: 'from-amber-800 via-orange-900 to-rose-950',
    description: 'Warm golden hour lighting',
  },
  {
    id: 'cozy',
    name: 'Cozy Room',
    icon: '☕',
    gradient: 'from-amber-950 via-yellow-950 to-stone-900',
    description: 'Warm cafe ambiance',
  },
];

export default function BackgroundSelector({
  isOpen,
  activePreset,
  onSelect,
  onClose,
}: BackgroundSelectorProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-24 right-4 z-40 w-80 bg-[#111118]/95 backdrop-blur-xl border border-[#2A2A3A] p-5 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#7C3AED]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Video Background</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[#8B8BA7] hover:text-white hover:bg-[#1A1A26] transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] text-[#8B8BA7] mb-4">
        Customize your video appearance live during the conversation.
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {PRESETS.map((p) => {
          const isSelected = activePreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between h-20 relative overflow-hidden ${
                isSelected
                  ? 'border-[#7C3AED] bg-gradient-to-br from-[#7C3AED]/20 to-[#EC4899]/10 shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                  : 'border-[#2A2A3A] bg-[#1A1A26]/80 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xl">{p.icon}</span>
                {isSelected && (
                  <span className="w-4 h-4 rounded-full bg-[#7C3AED] flex items-center justify-center text-white">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-white">{p.name}</div>
                <div className="text-[9px] text-[#8B8BA7] truncate">{p.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
