'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Check, AlertCircle, RefreshCw, Sparkles, Palette } from 'lucide-react';
import toast from 'react-hot-toast';
import ARFilterOverlay, { ARFilterType } from './ARFilterOverlay';

export type SnapshotBgType = 'none' | 'studio' | 'cyberpunk' | 'sunset' | 'cosmic' | 'emerald' | 'blur';

interface CompulsoryPhotoModalProps {
  isOpen: boolean;
  localStream: MediaStream | null;
  onPhotoSaved: (photoDataUrl: string) => void;
  onClose?: () => void;
  isExistingUser?: boolean;
}

const BG_PRESETS: Array<{ id: SnapshotBgType; label: string; icon: string; style: string }> = [
  { id: 'none', label: 'Original', icon: '📷', style: 'bg-black' },
  { id: 'studio', label: 'Studio', icon: '🎬', style: 'bg-gradient-to-tr from-zinc-950 via-neutral-900 to-black' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: '🌆', style: 'bg-gradient-to-tr from-violet-950 via-purple-900 to-cyan-950' },
  { id: 'sunset', label: 'Sunset', icon: '🌅', style: 'bg-gradient-to-tr from-amber-950 via-orange-950 to-rose-950' },
  { id: 'cosmic', label: 'Galaxy', icon: '🌌', style: 'bg-gradient-to-tr from-indigo-950 via-purple-950 to-slate-950' },
  { id: 'emerald', label: 'Emerald', icon: '🌿', style: 'bg-gradient-to-tr from-emerald-950 via-teal-900 to-slate-950' },
  { id: 'blur', label: 'Portrait', icon: '🌫️', style: 'bg-slate-900' },
];

export default function CompulsoryPhotoModal({
  isOpen,
  localStream,
  onPhotoSaved,
  onClose,
  isExistingUser = false,
}: CompulsoryPhotoModalProps) {
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [bgPreset, setBgPreset] = useState<SnapshotBgType>('none');
  const [activeFilter, setActiveFilter] = useState<ARFilterType>('none');

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up any running countdown on unmount or close
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

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

  const applyBackgroundComposite = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    preset: SnapshotBgType
  ) => {
    if (preset === 'none') return;
    ctx.save();
    if (preset === 'studio') {
      const rad = ctx.createRadialGradient(width / 2, height / 2, width * 0.15, width / 2, height / 2, width * 0.7);
      rad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      rad.addColorStop(1, 'rgba(10, 10, 18, 0.75)');
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, width, height);
    } else if (preset === 'cyberpunk') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, 'rgba(124, 58, 237, 0.35)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0.35)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (preset === 'sunset') {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(245, 158, 11, 0.3)');
      grad.addColorStop(1, 'rgba(236, 72, 153, 0.3)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (preset === 'cosmic') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, 'rgba(88, 28, 135, 0.4)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (preset === 'emerald') {
      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.15, width / 2, height / 2, width * 0.65);
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
      grad.addColorStop(1, 'rgba(6, 78, 59, 0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (preset === 'blur') {
      const rad = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.8);
      rad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
      rad.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  };

  // Take selfie with 3-second countdown and flash
  const handleStartCapture = () => {
    if (!previewVideoRef.current) {
      toast.error('Camera preview not ready yet. Please wait a moment.');
      return;
    }

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    setCountdown(3);
    let current = 3;

    countdownTimerRef.current = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdown(current);
      } else {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
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

          // Apply selected background composite
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          applyBackgroundComposite(ctx, canvas.width, canvas.height, bgPreset);

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
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 640;
          canvas.height = img.height || 480;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            applyBackgroundComposite(ctx, canvas.width, canvas.height, bgPreset);
            setPreviewPhoto(canvas.toDataURL('image/jpeg', 0.9));
          } else {
            setPreviewPhoto(reader.result as string);
          }
          toast.success('Photo loaded! Review and confirm.');
        };
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
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

  const selectedBgStyle = BG_PRESETS.find((b) => b.id === bgPreset)?.style || 'bg-black';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="max-w-md w-full bg-[#111118] border border-[#2A2A3A] p-5 sm:p-7 rounded-3xl shadow-2xl text-center relative overflow-hidden max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Close button for existing users */}
        {isExistingUser && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800/80 hover:bg-zinc-700 transition z-30"
          >
            ✕
          </button>
        )}

        {/* Shutter flash effect */}
        {isFlashing && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-200" />
        )}

        {/* Header Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{isExistingUser ? 'Update Snapshot' : 'Step 1: Match Verification'}</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white mb-1">
          {isExistingUser ? 'Change Your Snapshot' : 'Attach Your Photo'}
        </h2>
        <p className="text-xs text-[#8B8BA7] mb-4 leading-relaxed">
          {isExistingUser
            ? 'Snap a fresh photo to show strangers before they connect with you on video.'
            : 'FaceChat requires a verified selfie before matching. Strangers will see this snapshot to accept (✓) or pass (✕)!'}
        </p>

        {/* Live Camera Preview / Captured Photo Frame with Background and Filter */}
        <div
          className={`w-56 h-64 mx-auto mb-3 rounded-2xl border-2 border-[#7C3AED] overflow-hidden relative shadow-2xl flex items-center justify-center ${selectedBgStyle} transition-colors duration-300`}
        >
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

              {/* Dynamic Face Tracking AR Filter Overlay */}
              <ARFilterOverlay filter={activeFilter} isMirrored={true} videoRef={previewVideoRef} />

              {/* Live Selfie Framing Guides */}
              <div className="absolute inset-3 border border-dashed border-white/30 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-[10px] text-white/60 bg-black/50 px-2 py-0.5 rounded backdrop-blur">
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

        {/* Background Options Swatches */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300 mb-1.5 px-1">
            <span className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-purple-400" /> Photo Background
            </span>
            <span className="text-[10px] text-purple-300 capitalize font-mono">{bgPreset}</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {BG_PRESETS.map((bg) => (
              <button
                key={bg.id}
                onClick={() => setBgPreset(bg.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border flex items-center gap-1 transition flex-shrink-0 ${
                  bgPreset === bg.id
                    ? 'border-purple-400 bg-purple-600/30 text-white shadow-sm ring-1 ring-purple-400/50'
                    : 'border-zinc-800 bg-[#1A1A26] text-zinc-400 hover:text-white'
                }`}
              >
                <span>{bg.icon}</span>
                <span>{bg.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Snapshot Filter Options (Dog, Cat, Shades, Crown, Flowers) */}
        {!previewPhoto && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300 mb-1.5 px-1">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Snapshot AR Filter (Face Tracking)
              </span>
              <span className="text-[10px] text-pink-300 capitalize font-mono">{activeFilter}</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {[
                { id: 'none' as ARFilterType, label: 'Off', icon: '🚫' },
                { id: 'dog' as ARFilterType, label: 'Puppy', icon: '🐶' },
                { id: 'cat' as ARFilterType, label: 'Kitty', icon: '🐱' },
                { id: 'shades' as ARFilterType, label: 'Shades', icon: '🕶️' },
                { id: 'crown' as ARFilterType, label: 'Crown', icon: '👑' },
                { id: 'flowers' as ARFilterType, label: 'Flowers', icon: '🌸' },
                { id: 'cyberpunk' as ARFilterType, label: 'Cyber', icon: '👽' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border flex items-center gap-1 transition flex-shrink-0 ${
                    activeFilter === f.id
                      ? 'border-pink-400 bg-pink-600/30 text-white shadow-sm ring-1 ring-pink-400/50'
                      : 'border-zinc-800 bg-[#1A1A26] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="space-y-2 mb-3">
          {previewPhoto ? (
            // Once photo is captured: Confirm or Retake
            <div className="space-y-2">
              <button
                onClick={handleConfirm}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-extrabold text-sm hover:opacity-90 transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>Confirm & Start Matching</span>
              </button>

              <button
                onClick={handleRetake}
                className="w-full py-2 bg-[#1A1A26] border border-[#2A2A3A] hover:border-white/30 text-[#8B8BA7] hover:text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
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
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-extrabold text-sm hover:opacity-90 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
              >
                <Camera className="w-5 h-5" />
                <span>{countdown !== null ? `Taking photo in ${countdown}...` : '📸 Capture Selfie (3s Timer)'}</span>
              </button>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2 px-4 bg-[#1A1A26] border border-[#2A2A3A] hover:border-white/30 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
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
