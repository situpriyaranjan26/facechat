'use client';

import React, { useState } from 'react';
import { Star, X, Check, Heart, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string | null;
  partnerId?: string | null;
  partnerCountry?: string;
}

const TAG_OPTIONS = ['Friendly', 'Engaging', 'Great Vibe', 'Respectful', 'Funny', 'Interesting'];

export default function RatingModal({
  isOpen,
  onClose,
  conversationId,
  partnerId,
  partnerCountry = 'Global',
}: RatingModalProps) {
  const [stars, setStars] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (partnerId) {
        await api.post('/ratings', {
          conversationId: conversationId || undefined,
          ratedUserId: partnerId,
          stars,
          feedbackTags: selectedTags,
        });
      }
      setSubmitted(true);
      toast.success('Rating recorded! Thank you for keeping FaceChat positive.');
      setTimeout(() => {
        onClose();
        setSubmitted(false);
      }, 1000);
    } catch (e: any) {
      console.error('Rating submission failed', e);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#111118] border border-[#2A2A3A] w-full max-w-sm rounded-3xl p-6 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#8B8BA7] hover:text-white rounded-full bg-[#1A1A26] transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] flex items-center justify-center mx-auto mb-4 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]">
          <Star className="w-6 h-6 fill-white" />
        </div>

        <h3 className="text-lg font-bold text-white mb-1">
          How was your conversation?
        </h3>
        <p className="text-xs text-[#8B8BA7] mb-5">
          Rate your stranger from {partnerCountry} to improve future matchmaking quality.
        </p>

        {/* 1-5 Star Picker */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStars(s)}
              className="p-1 transition transform hover:scale-110 active:scale-95"
            >
              <Star
                className={`w-8 h-8 ${
                  s <= stars
                    ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                    : 'text-gray-600'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Feedback tags */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {TAG_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                selectedTags.includes(tag)
                  ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-white'
                  : 'bg-[#1A1A26] border-[#2A2A3A] text-[#8B8BA7] hover:border-gray-600'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading || submitted}
            className="flex-1 py-3 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-bold text-sm rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(124,58,237,0.3)]"
          >
            {submitted ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            <span>{submitted ? 'Submitted!' : 'Submit Rating'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 bg-[#1A1A26] border border-[#2A2A3A] text-[#8B8BA7] hover:text-white rounded-xl text-xs font-semibold transition"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
