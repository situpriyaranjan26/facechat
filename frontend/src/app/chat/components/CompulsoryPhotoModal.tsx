'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, Check, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface CompulsoryPhotoModalProps {
  isOpen: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  onPhotoSaved: (photoDataUrl: string) => void;
}

export default function CompulsoryPhotoModal({
  isOpen,
  localVideoRef,
  onPhotoSaved,
}: CompulsoryPhotoModalProps) {
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1-Click Snapshot from live camera feed
  const takeSnapshot = () => {
    if (!localVideoRef.current) {
      toast.error('Camera preview not ready yet. Please wait a moment.');
      return;
    }
    const video = localVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPreviewPhoto(dataUrl);
    toast.success('Selfie captured! Click Confirm to start matching.');
  };

  // Upload photo from file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG/JPG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewPhoto(reader.result);
        toast.success('Photo loaded! Click Confirm to start matching.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!previewPhoto) {
      toast.error('Please take a selfie or upload a photo first.');
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('facechat_user_photo', previewPhoto);
    }
    onPhotoSaved(previewPhoto);
    toast.success('Profile photo verified! Starting matchmaking.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111118] border border-[#2A2A3A] p-6 sm:p-8 rounded-3xl shadow-2xl text-center">
        {/* Header Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-4">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Mandatory Step</span>
        </div>

        <h2 className="text-2xl font-black text-white mb-2">Attach Your Photo</h2>
        <p className="text-xs text-[#8B8BA7] mb-6 leading-relaxed">
          FaceChat requires a verified snapshot photo before matching. Strangers will view this photo
          to accept (✓) or pass (✕) before video connects!
        </p>

        {/* Photo Preview Container */}
        <div className="w-48 h-48 mx-auto mb-6 rounded-2xl bg-[#1A1A26] border-2 border-dashed border-[#7C3AED]/50 overflow-hidden relative flex items-center justify-center shadow-inner">
          {previewPhoto ? (
            <img
              src={previewPhoto}
              alt="Snapshot preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-4">
              <Camera className="w-10 h-10 text-[#7C3AED] mx-auto mb-2 opacity-80" />
              <p className="text-[11px] text-[#8B8BA7]">No photo attached yet</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={takeSnapshot}
              className="py-3 px-4 bg-[#1A1A26] border border-[#7C3AED]/40 hover:border-[#7C3AED] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 hover:bg-[#7C3AED]/10"
            >
              <Camera className="w-4 h-4 text-[#EC4899]" />
              <span>{previewPhoto ? 'Retake Selfie' : 'Take Selfie'}</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-4 bg-[#1A1A26] border border-[#2A2A3A] hover:border-white/30 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 hover:bg-[#2A2A3A]/40"
            >
              <Upload className="w-4 h-4 text-[#06B6D4]" />
              <span>Upload Photo</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          <button
            onClick={handleConfirm}
            disabled={!previewPhoto}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-extrabold text-sm hover:opacity-90 transition active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
          >
            <Check className="w-5 h-5" />
            <span>Confirm & Start Talking</span>
          </button>
        </div>

        <p className="text-[10px] text-[#8B8BA7]">
          🔒 Photos are only shown during match preview to help both users decide.
        </p>
      </div>
    </div>
  );
}
