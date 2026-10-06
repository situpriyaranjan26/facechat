'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Mic, MicOff, Play, RefreshCw, AlertCircle, Volume2, Shield } from 'lucide-react';
import { requestMediaPermissions, stopAllTracks } from '@/lib/mediaUtils';
import Navbar from '@/components/layout/Navbar';

export default function SetupPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isConfirmed = sessionStorage.getItem('facechat_age_confirmed');
      if (isConfirmed !== 'true') {
        router.push('/age-gate');
        return;
      }
    }

    startMedia();

    return () => {
      if (stream) {
        stopAllTracks(stream);
      }
    };
  }, []);

  const startMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const mediaStream = await requestMediaPermissions(true, true);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Media permission error', err);
      setError('Camera and microphone access is required to talk on FaceChat.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleStartTalking = () => {
    router.push('/chat');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8F8FF] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-xl w-full bg-[#111118] border border-[#2A2A3A] p-6 rounded-3xl shadow-2xl flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2 text-[#7C3AED]">
            <Shield className="w-5 h-5 text-[#EC4899]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#EC4899]">
              Live Face-to-Face Video Required
            </span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            Camera & Microphone Setup
          </h1>
          <p className="text-xs text-[#8B8BA7] mb-6 text-center">
            Make sure your face is visible in the frame before entering. Video is always on to guarantee authentic conversations.
          </p>

          <div className="w-full aspect-video bg-[#0A0A0F] rounded-2xl overflow-hidden relative border border-[#2A2A3A] mb-6 flex items-center justify-center shadow-inner">
            {loading && (
              <div className="flex flex-col items-center gap-2 text-[#8B8BA7]">
                <RefreshCw className="w-8 h-8 animate-spin text-[#7C3AED]" />
                <span className="text-sm">Accessing camera & microphone...</span>
              </div>
            )}

            {error && !loading && (
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <p className="text-sm text-red-400 font-medium">{error}</p>
                <button
                  onClick={startMedia}
                  className="px-4 py-2 bg-[#1A1A26] border border-[#2A2A3A] rounded-xl text-sm font-semibold hover:bg-[#2A2A3A] transition"
                >
                  Try Again
                </button>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${loading || error ? 'hidden' : ''}`}
            />

            {!loading && !error && (
              <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur rounded-full text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Camera Live
              </div>
            )}
          </div>

          {/* Audio controls (Video toggle deliberately removed per policy) */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={toggleMic}
              className={`px-5 py-3 rounded-2xl border transition flex items-center gap-2 text-sm font-medium ${
                isMuted
                  ? 'bg-red-500/20 border-red-500 text-red-400'
                  : 'bg-[#1A1A26] border-[#2A2A3A] text-white hover:bg-[#2A2A3A]'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
              <span>{isMuted ? 'Microphone Muted' : 'Microphone Ready'}</span>
            </button>
          </div>

          <button
            onClick={handleStartTalking}
            disabled={loading || !!error}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-extrabold text-lg shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_40px_rgba(236,72,153,0.6)] active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>START TALKING</span>
          </button>
        </div>
      </main>
    </div>
  );
}
