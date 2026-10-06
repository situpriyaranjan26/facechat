'use client';

import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string | null;
  reportedUserId?: string;
  reportedGuestId?: string;
}

const REPORT_REASONS = [
  'Nudity / sexual content',
  'Harassment',
  'Hate / abusive behavior',
  'Threats',
  'Spam / scam',
  'Underage user',
  'Suspicious behavior',
  'Other',
];

export default function ReportModal({
  isOpen,
  onClose,
  conversationId,
  reportedUserId,
  reportedGuestId,
}: ReportModalProps) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/reports', {
        reportedUserId,
        reportedGuestSessionId: reportedGuestId,
        conversationId,
        reason,
        description,
      });
      toast.success('Report submitted. Thank you for keeping FaceChat safe.');
      onClose();
    } catch (err: any) {
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111118] border border-[#2A2A3A] w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#8B8BA7] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/10 text-red-400 rounded-xl">
            <Flag className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white">Report User</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8B8BA7] mb-2 uppercase">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#1A1A26] border border-[#2A2A3A] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7C3AED]"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8B8BA7] mb-2 uppercase">
              Explanation (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional details..."
              rows={3}
              className="w-full bg-[#1A1A26] border border-[#2A2A3A] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7C3AED] resize-none text-sm placeholder-[#8B8BA7]/50"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[#1A1A26] border border-[#2A2A3A] rounded-xl font-semibold text-sm text-[#8B8BA7] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
