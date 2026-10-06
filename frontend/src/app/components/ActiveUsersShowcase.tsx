'use client';

import React, { useState, useEffect } from 'react';
import { Star, Video, Zap, Globe, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import RazorpayModal, { RazorpayItem } from './payments/RazorpayModal';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export interface ActiveUser {
  id: string;
  displayName: string;
  country: string;
  avatarUrl: string;
  bio: string;
  hourlyRateUSD: number;
  hourlyRateINR: number;
  isOnline: boolean;
  languages: string[];
  rating: number;
  callsCompleted: number;
  interests?: string[];
}

const FALLBACK_ACTIVE_USERS: ActiveUser[] = [
  {
    id: 'usr_maya_01',
    displayName: 'Maya Lin',
    country: 'Japan 🇯🇵',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    bio: 'Tokyo nightlife & street photography lover 📸 Let\'s talk music and travel!',
    hourlyRateUSD: 2,
    hourlyRateINR: 165,
    isOnline: true,
    languages: ['English', 'Japanese'],
    rating: 4.9,
    callsCompleted: 142,
    interests: ['Photography', 'J-Rock', 'Travel'],
  },
  {
    id: 'usr_elena_02',
    displayName: 'Elena Rostova',
    country: 'Spain 🇪🇸',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    bio: 'Architecture student in Barcelona 🏛️ Fluent in 3 languages, loves deep late night chats!',
    hourlyRateUSD: 2,
    hourlyRateINR: 165,
    isOnline: true,
    languages: ['English', 'Spanish', 'French'],
    rating: 5.0,
    callsCompleted: 218,
    interests: ['Architecture', 'Art', 'Coffee'],
  },
  {
    id: 'usr_liam_03',
    displayName: 'Liam Davies',
    country: 'United Kingdom 🇬🇧',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80',
    bio: 'London indie guitarist & traveler 🎸 Always down for meaningful conversations.',
    hourlyRateUSD: 2,
    hourlyRateINR: 165,
    isOnline: true,
    languages: ['English'],
    rating: 4.8,
    callsCompleted: 98,
    interests: ['Guitar', 'Indie Rock', 'Backpacking'],
  },
  {
    id: 'usr_ananya_04',
    displayName: 'Ananya Sharma',
    country: 'India 🇮🇳',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
    bio: 'AI researcher & podcast host in Bengaluru ☕ Love discussing philosophy and startups!',
    hourlyRateUSD: 2,
    hourlyRateINR: 165,
    isOnline: true,
    languages: ['English', 'Hindi'],
    rating: 4.9,
    callsCompleted: 310,
    interests: ['AI', 'Tech', 'Podcasts'],
  },
  {
    id: 'usr_lucas_05',
    displayName: 'Lucas Silva',
    country: 'Brazil 🇧🇷',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    bio: 'Surfer & DJ based in Rio de Janeiro 🏄‍♂️ Bringing positive vibes and good tunes.',
    hourlyRateUSD: 2,
    hourlyRateINR: 165,
    isOnline: true,
    languages: ['English', 'Portuguese'],
    rating: 4.9,
    callsCompleted: 175,
    interests: ['Surfing', 'Electronic Music', 'Cooking'],
  },
  {
    id: 'usr_chloe_06',
    displayName: 'Chloe Martin',
    country: 'France 🇫🇷',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
    bio: 'Fashion designer in Paris 🎨 Friendly, warm, and excited to meet global friends.',
    hourlyRateUSD: 2,
    hourlyRateINR: 165,
    isOnline: true,
    languages: ['English', 'French'],
    rating: 5.0,
    callsCompleted: 260,
    interests: ['Fashion', 'Cinema', 'Wine'],
  },
];

interface ActiveUsersShowcaseProps {
  onDirectConnectInitiated?: (user: ActiveUser) => void;
  compact?: boolean;
}

export default function ActiveUsersShowcase({
  onDirectConnectInitiated,
  compact = false,
}: ActiveUsersShowcaseProps) {
  const [users, setUsers] = useState<ActiveUser[]>(FALLBACK_ACTIVE_USERS);
  const [selectedUser, setSelectedUser] = useState<ActiveUser | null>(null);
  const [razorpayItem, setRazorpayItem] = useState<RazorpayItem | null>(null);
  const router = useRouter();

  useEffect(() => {
    api.get('/users/active')
      .then((res) => {
        if (res.data?.activeUsers?.length) {
          setUsers(res.data.activeUsers);
        }
      })
      .catch(() => {
        // Fallback provided
      });
  }, []);

  const handleConnectClick = (user: ActiveUser) => {
    setSelectedUser(user);
    setRazorpayItem({
      type: 'direct_connect',
      id: user.id,
      name: `1-Hour Direct Call with ${user.displayName}`,
      amountINR: user.hourlyRateINR || 165,
      amountUSD: user.hourlyRateUSD || 2,
      description: `Connect directly for 1 hour. No queue waiting, guaranteed face-to-face talk!`,
    });
  };

  const handlePaymentSuccess = () => {
    if (!selectedUser) return;
    toast.success(`🎉 Connected! Starting private call with ${selectedUser.displayName}...`, {
      icon: '📞',
      duration: 5000,
    });

    if (onDirectConnectInitiated) {
      onDirectConnectInitiated(selectedUser);
    } else {
      router.push('/chat');
    }
  };

  return (
    <div className={`w-full ${compact ? 'py-4' : 'py-12'}`}>
      {!compact && (
        <div className="text-center max-w-2xl mx-auto mb-10 px-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Featured Active Stars</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
            Connect Directly with Most Active Users
          </h2>
          <p className="text-sm text-[#8B8BA7]">
            Skip the random queue and connect 1-on-1 with popular verified members worldwide for just <span className="text-amber-400 font-bold">$2 / hour (₹165)</span>.
          </p>
        </div>
      )}

      {/* Grid of Active Users */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 ${
        compact ? 'max-w-4xl mx-auto' : 'max-w-6xl mx-auto'
      }`}>
        {users.map((user) => (
          <div
            key={user.id}
            className="group relative bg-[#111118] border border-[#2A2A3A] hover:border-purple-500/50 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-purple-500/10 flex flex-col justify-between"
          >
            {/* Top Image with Badges */}
            <div className="relative h-56 w-full overflow-hidden bg-zinc-900">
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111118] via-transparent to-black/30" />

              {/* Online indicator */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Live Now
                </span>
              </div>

              {/* Hourly Price Tag */}
              <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs px-3 py-1 rounded-full shadow-lg">
                $2 / hr (₹165)
              </div>

              {/* Bottom Country & Rating */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                <div className="flex items-center gap-1.5 text-xs font-semibold bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                  <Globe className="w-3.5 h-3.5 text-[#06B6D4]" />
                  <span>{user.country}</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-lg text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{user.rating}</span>
                </div>
              </div>
            </div>

            {/* Profile Content */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-white group-hover:text-purple-300 transition">
                  {user.displayName}
                </h3>
                <p className="text-xs text-[#8B8BA7] mt-1 line-clamp-2 leading-relaxed">
                  {user.bio}
                </p>

                {/* Interest Tags */}
                {user.interests && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {user.interests.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-[#1A1A26] border border-[#2A2A3A] text-zinc-300 px-2 py-0.5 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Direct Connect CTA Button */}
              <button
                onClick={() => handleConnectClick(user)}
                className="mt-5 w-full py-3 rounded-2xl bg-gradient-to-r from-[#7C3AED] via-purple-600 to-[#EC4899] hover:opacity-95 text-white font-extrabold text-xs transition shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Video className="w-4 h-4" />
                <span>Connect Directly ($2/hr)</span>
                <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400 ml-0.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Razorpay Checkout Modal */}
      <RazorpayModal
        isOpen={!!razorpayItem}
        item={razorpayItem}
        onClose={() => setRazorpayItem(null)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
