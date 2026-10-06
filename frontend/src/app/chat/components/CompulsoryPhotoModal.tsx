'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Check, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface CompulsoryPhotoModalProps {
  isOpen: boolean;
  localStream: MediaStream | null;
  onPhotoSaved: (photoDataUrl: string) => void;
}

export default function CompulsoryPhotoModal({
  isOpen,
  localStream,
  onPhotoSaved,
}: CompulsoryPhotoModalProps) {
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Attach live camera stream to the preview mirror whenever modal is open and no photo is frozen
  useEffect(() => {
    if (isOpen && !previewPhoto && previewVideoRef.current && localStream) {
      previewVideoRef.current.srcObject = localStream;
      previewVideoRef.current.play().catch((err) => {
        console.warn('Failed to autoplay selfie preview:', err);
      });
    }
  }, [isOpen, previewPhoto, localStream]);

  if (!isOpen) return null;

  // Take selfie with 3-second countdown and flash
  const handleStartCapture = () => {
    if (!previewVideoRef.current) {
      toast.error('Camera preview not ready yet. Please wait a moment.');
      return;
    }

    setCountdown(3);
    let current = 3;

    const timer = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdown(current);
      } else {
        clearInterval(timer);
        setCountdown(null);

        // Flash effect
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 200);

        // Capture frame from the live video
        const video = previewVideoRef.current;
        if (!video) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Mirror horizontally to match selfie mirror
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setPreviewPhoto(dataUrl);
          toast.success('Selfie captured! Review your photo.');
        }
      }
    }, 900);
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
        toast.success('Photo loaded! Review and confirm.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setPreviewPhoto(null);
    setCountdown(null);
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
    toast.success('Photo verified! Starting matchmaking.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="max-w-md w-full bg-[#111118] border border-[#2A2A3A] p-6 sm:p-8 rounded-3xl shadow-2xl text-center relative overflow-hidden">
        {/* Shutter flash effect */}
        {isFlashing && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-200" />
        )}

        {/* Header Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Step 1: Match Verification</span>
        </div>

        <h2 className="text-2xl font-black text-white mb-2">Attach Your Photo</h2>
        <p className="text-xs text-[#8B8BA7] mb-5 leading-relaxed">
          FaceChat requires a verified selfie before matching. Strangers will see this snapshot to accept (✓) or pass (✕) before video connects!
        </p>

        {/* Live Camera Preview / Captured Photo Frame */}
        <div className="w-56 h-64 mx-auto mb-5 rounded-2xl bg-black border-2 border-[#7C3AED] overflow-hidden relative shadow-2xl flex items-center justify-center">
          {previewPhoto ? (
            // Frozen Captured Photo
            <img
              src={previewPhoto}
              alt="Snapshot preview"
              className="w-full h-full object-cover animate-in fade-in"
            />
          ) : (
            // Live Selfie Camera Mirror
            <div className="relative w-full h-full">
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Live Selfie Framing Guides */}
              <div className="absolute inset-4 border border-dashed border-white/30 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-[10px] text-white/50 bg-black/40 px-2 py-0.5 rounded backdrop-blur">
                  Center Face Here
                </span>
              </div>

              {/* 3-2-1 Countdown Overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
                  <span className="text-7xl font-black text-white animate-ping">
                    {countdown}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="space-y-3 mb-3">
          {previewPhoto ? (
            // Once photo is captured: Confirm or Retake
            <div className="space-y-2">
              <button
                onClick={handleConfirm}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-extrabold text-sm hover:opacity-90 transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>Confirm & Start Matching</span>
              </button>

              <button
                onClick={handleRetake}
                className="w-full py-2.5 bg-[#1A1A26] border border-[#2A2A3A] hover:border-white/30 text-[#8B8BA7] hover:text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake Photo</span>
              </button>
            </div>
          ) : (
            // Before photo is captured: Click Capture (with countdown) or Upload
            <div className="space-y-2">
              <button
                onClick={handleStartCapture}
                disabled={countdown !== null}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-extrabold text-sm hover:opacity-90 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
              >
                <Camera className="w-5 h-5" />
                <span>{countdown !== null ? `Taking photo in ${countdown}...` : '📸 Capture Selfie (3s Timer)'}</span>
              </button>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2.5 px-4 bg-[#1A1A26] border border-[#2A2A3A] hover:border-white/30 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5 text-[#06B6D4]" />
                  <span>Or Upload From File</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          )}
        </div>

        <p className="text-[10px] text-[#8B8BA7]">
          🔒 Photos are only shown during match preview to help both users decide before video begins.
        </p>
      </div>
    </div>
  );
}
