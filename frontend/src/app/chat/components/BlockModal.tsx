'use client';

import React, { useState } from 'react';
import { Ban, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBlockConfirmed: () => void;
  conversationId: string | null;
  blockedUserId?: string;
  blockedGuestId?: string;
}

export default function BlockModal({
  isOpen,
  onClose,
  onBlockConfirmed,
  conversationId,
  blockedUserId,
  blockedGuestId,
}: BlockModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleBlock = async () => {
    setLoading(true);
    try {
      await api.post('/moderation/block', {
        blockedUserId,
        blockedGuestId,
        conversationId,
        blockType: 'permanent',
      });
      toast.success('User blocked successfully.');
      onBlockConfirmed();
      onClose();
    } catch (err: any) {
      toast.error('Failed to block user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111118] border border-[#2A2A3A] w-full max-w-sm p-6 rounded-3xl shadow-2xl text-center">
        <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Ban className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Block this person?</h2>
        <p className="text-sm text-[#8B8BA7] mb-6">
          You will immediately disconnect from this conversation and won't be matched with them again.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-[#1A1A26] border border-[#2A2A3A] rounded-xl font-semibold text-sm text-[#8B8BA7] hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleBlock}
            disabled={loading}
            className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
          >
            {loading ? 'Blocking...' : 'Block & Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
