'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Video, Globe, Shield, Sparkles, Zap, ArrowRight, Play } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function HomePage() {
  const router = useRouter();

  const handleStartTalking = () => {
    if (typeof window !== 'undefined') {
      const isConfirmed = sessionStorage.getItem('facechat_age_confirmed');
      if (isConfirmed === 'true') {
        router.push('/setup');
      } else {
        router.push('/age-gate');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8F8FF] flex flex-col font-sans selection:bg-[#7C3AED] selection:text-white">
      <Navbar />

      <main className="flex-1 flex flex-col justify-center items-center px-4 pt-20 pb-16 text-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-[#7C3AED]/20 to-[#EC4899]/20 blur-[130px] rounded-full pointer-events-none" />

        <div className="z-10 max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A1A26] border border-[#2A2A3A] text-sm text-[#EC4899] font-medium mb-6 animate-pulse">
            <Sparkles className="w-4 h-4" />
            <span>Next-Gen Stranger Video Chat</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-[#F8F8FF] to-gray-400">
            FACE<span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7C3AED] to-[#EC4899]">CHAT</span>
          </h1>

          <p className="text-2xl md:text-3xl font-bold text-white mb-4">
            Meet someone new.
          </p>

          <p className="text-lg md:text-xl text-[#8B8BA7] max-w-2xl mb-10 leading-relaxed">
            Talk face-to-face with people from around the world. Instant matching, zero friction, and exciting real conversations.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center max-w-md">
            <button
              onClick={handleStartTalking}
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-extrabold text-xl shadow-[0_0_40px_rgba(124,58,237,0.5)] hover:shadow-[0_0_60px_rgba(236,72,153,0.7)] hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer"
            >
              <Play className="w-6 h-6 fill-white" />
              <span>START TALKING</span>
            </button>
          </div>

          <p className="text-xs text-[#8B8BA7] mt-4 font-medium flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#10B981]" />
            Strictly 18+ only • Guest session enabled • Free to start
          </p>
        </div>

        <section className="z-10 mt-24 max-w-5xl mx-auto w-full px-4">
          <h2 className="text-sm uppercase tracking-widest text-[#8B8BA7] font-bold mb-12">
            HOW IT WORKS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Start',
                desc: 'Click Start and grant camera & microphone access in one click.',
                icon: Video,
              },
              {
                step: '02',
                title: 'Get Matched',
                desc: 'Instantly get paired with a stranger anywhere on the globe.',
                icon: Globe,
              },
              {
                step: '03',
                title: 'Talk & Connect',
                desc: 'Have real conversations, discover new cultures, and earn Face Tokens.',
                icon: Zap,
              },
              {
                step: '04',
                title: 'Next Anytime',
                desc: 'Skip instantly to the next stranger with lightning-fast Next button.',
                icon: ArrowRight,
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-[#111118] border border-[#2A2A3A] p-6 rounded-2xl flex flex-col items-start text-left hover:border-[#7C3AED]/50 transition duration-300 relative group overflow-hidden"
              >
                <div className="text-xs font-mono font-bold text-[#8B8BA7] mb-4">
                  STEP {item.step}
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#1A1A26] border border-[#2A2A3A] flex items-center justify-center mb-4 text-[#EC4899] group-hover:scale-110 transition duration-300">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-[#8B8BA7] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="z-10 mt-24 max-w-5xl mx-auto w-full px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#111118]/80 backdrop-blur border border-[#2A2A3A] p-8 rounded-3xl text-left">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-white mb-2">Ultra-Fast Next</h3>
              <p className="text-sm text-[#8B8BA7]">
                Sub-second matchmaking so you never have to wait around. Keep the energy flowing.
              </p>
            </div>
            <div className="bg-[#111118]/80 backdrop-blur border border-[#2A2A3A] p-8 rounded-3xl text-left">
              <div className="text-3xl mb-4">🪙</div>
              <h3 className="text-xl font-bold text-white mb-2">Face Coins Economy</h3>
              <p className="text-sm text-[#8B8BA7]">
                Earn coins as you talk, unlock milestones, and customize your conversation journey.
              </p>
            </div>
            <div className="bg-[#111118]/80 backdrop-blur border border-[#2A2A3A] p-8 rounded-3xl text-left">
              <div className="text-3xl mb-4">🛡️</div>
              <h3 className="text-xl font-bold text-white mb-2">Safe & Moderated</h3>
              <p className="text-sm text-[#8B8BA7]">
                Strict 18+ enforcement, one-click block & report, and comprehensive user protection.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
