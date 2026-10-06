'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic,
  MicOff,
  SkipForward,
  PhoneOff,
  Flag,
  Ban,
  MessageSquare,
  Globe,
  Loader2,
  Sparkles,
  Camera,
  Star,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { requestMediaPermissions, stopAllTracks } from '@/lib/mediaUtils';
import { WebRTCManager } from '@/lib/webrtc';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import api from '@/lib/api';
import { getCountryFlag } from '@/lib/geoUtils';
import toast from 'react-hot-toast';

import ReportModal from './components/ReportModal';
import BlockModal from './components/BlockModal';
import GuestWarningBanner from './components/GuestWarningBanner';
import GuestExpiredModal from './components/GuestExpiredModal';
import RatingModal from './components/RatingModal';
import TextChat from './components/TextChat';
import CoinDisplay from '@/components/ui/CoinDisplay';

type CallState = 'idle' | 'searching' | 'connecting' | 'connected' | 'ended';

export default function ChatPage() {
  const router = useRouter();
  const { user, isAuthenticated, isGuest, guestToken, guestTimeRemaining, guestWarning } = useAuthStore();
  const { balance, fetchBalance } = useWalletStore();

  const [callState, setCallState] = useState<CallState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [partnerCountry, setPartnerCountry] = useState('Global');
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  // Preference pass status
  const [prefRemaining, setPrefRemaining] = useState<string | null>(null);

  // Modals & Chat
  const [showReport, setShowReport] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [lastFinishedConvId, setLastFinishedConvId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ text: string; sender: 'me' | 'peer'; timestamp: number }>>([]);
  const [showGuestExpired, setShowGuestExpired] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const rtcRef = useRef<WebRTCManager | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 18+ check
    if (typeof window !== 'undefined') {
      const isConfirmed = sessionStorage.getItem('facechat_age_confirmed');
      if (isConfirmed !== 'true') {
        router.push('/age-gate');
        return;
      }
    }

    initMediaAndSocket();
    fetchPreferenceStatus();

    return () => {
      cleanup();
    };
  }, []);

  const fetchPreferenceStatus = async () => {
    try {
      const res = await api.get('/subscriptions/preference-pass');
      if (res.data?.hasPass && res.data?.isActive) {
        setPrefRemaining(res.data.formattedTime);
      }
    } catch {
      // Guest or unauthenticated
    }
  };

  const cleanup = () => {
    if (localStream) stopAllTracks(localStream);
    if (rtcRef.current) rtcRef.current.close();
    if (socketRef.current) socketRef.current.disconnect();
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
  };

  const initMediaAndSocket = async () => {
    try {
      // Video camera is ALWAYS ON (mandatory live video per policy)
      const stream = await requestMediaPermissions(true, true);
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize WebRTC
      const rtc = new WebRTCManager();
      rtcRef.current = rtc;

      rtc.setRemoteStreamCallback((rStream) => {
        setRemoteStream(rStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = rStream;
        }
      });

      // Connect Socket
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
      const socket = io(wsUrl, {
        auth: {
          guestToken: guestToken || undefined,
        },
        withCredentials: true,
      });
      socketRef.current = socket;

      setupSocketListeners(socket, rtc, stream);

      // Auto join queue
      socket.emit('join_queue', { preference: 'anyone' });
      setCallState('searching');
    } catch (err: any) {
      console.error('Initialization error', err);
      toast.error('Could not access camera or connect to server.');
    }
  };

  const setupSocketListeners = (socket: Socket, rtc: WebRTCManager, stream: MediaStream) => {
    socket.on('searching', () => {
      setCallState('searching');
      setRemoteStream(null);
      setDuration(0);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    });

    socket.on('matched', async (data: { conversationId: string; isInitiator: boolean; partnerCountry: string; partnerId?: string }) => {
      setActiveConversationId(data.conversationId);
      setPartnerCountry(data.partnerCountry || 'Global');
      setPartnerId(data.partnerId || null);
      setCallState('connecting');

      await rtc.createPeerConnection();
      rtc.addLocalStream(stream);

      rtc.setOnIceCandidate((candidate) => {
        socket.emit('ice_candidate', { candidate });
      });

      if (data.isInitiator) {
        const offer = await rtc.createOffer();
        socket.emit('offer', { sdp: offer });
      }
    });

    socket.on('offer', async (data: { sdp: any }) => {
      await rtc.createPeerConnection();
      rtc.addLocalStream(stream);

      rtc.setOnIceCandidate((candidate) => {
        socket.emit('ice_candidate', { candidate });
      });

      const answer = await rtc.handleOffer(data.sdp);
      socket.emit('answer', { sdp: answer });
      setCallState('connected');
      startTimer();
    });

    socket.on('answer', async (data: { sdp: any }) => {
      await rtc.handleAnswer(data.sdp);
      setCallState('connected');
      startTimer();
    });

    socket.on('ice_candidate', async (data: { candidate: any }) => {
      await rtc.addIceCandidate(data.candidate);
    });

    socket.on('chat_message', (data: { text: string; sender: 'peer'; timestamp: number }) => {
      setChatMessages((prev) => [...prev, data]);
      if (!showChat) {
        toast('New message from stranger', { icon: '💬' });
      }
    });

    socket.on('peer_disconnected', (data: { reason?: string; conversationId?: string }) => {
      setCallState('ended');
      setRemoteStream(null);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      toast('Stranger disconnected.', { icon: '👋' });

      // Trigger star rating prompt
      if (activeConversationId) {
        setLastFinishedConvId(activeConversationId);
        setShowRating(true);
      }
      fetchBalance();
    });

    socket.on('call_ended', (data: { reason?: string; conversationId?: string }) => {
      setCallState('ended');
      setRemoteStream(null);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);

      if (activeConversationId) {
        setLastFinishedConvId(activeConversationId);
        setShowRating(true);
      }
      fetchBalance();
    });

    socket.on('zero_coins', (data: { message: string }) => {
      toast.error(data.message || 'You need Face Tokens to talk! Refill at the wallet.');
      router.push('/wallet');
    });

    socket.on('guest_warning', (data: { secondsRemaining: number; message?: string }) => {
      toast(data.message || '2 minutes left before account sign-in is required.', {
        icon: '⏳',
        duration: 6000,
      });
    });

    socket.on('guest_expired', () => {
      setShowGuestExpired(true);
    });
  };

  const startTimer = () => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    setDuration(0);
    durationTimerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  // Video is strictly kept ON per platform rules; only microphone is toggled
  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleNext = () => {
    if (socketRef.current) {
      if (duration < 120 && callState === 'connected') {
        toast('Skipping under 2 minutes (-2 Face Tokens)', { icon: '⚡' });
      }
      socketRef.current.emit('next');
    }
    setCallState('searching');
    setRemoteStream(null);
    setChatMessages([]);
  };

  const handleEndCall = () => {
    if (socketRef.current) {
      socketRef.current.emit('end_call');
    }
    setCallState('idle');
    setRemoteStream(null);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    router.push('/');
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim() || !socketRef.current) return;
    socketRef.current.emit('chat_message', { text });
    setChatMessages((prev) => [
      ...prev,
      { text, sender: 'me', timestamp: Date.now() },
    ]);
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen w-screen bg-[#0A0A0F] text-[#F8F8FF] flex flex-col overflow-hidden font-sans select-none">
      {/* Top Status Bar */}
      <div className="h-14 bg-[#111118]/80 backdrop-blur border-b border-[#2A2A3A] px-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="text-lg font-black tracking-wider">
            FACE<span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7C3AED] to-[#EC4899]">CHAT</span>
          </div>
          {partnerCountry && callState === 'connected' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A1A26] border border-[#2A2A3A] text-xs font-semibold text-white shadow-sm">
              <span className="text-sm">{getCountryFlag(partnerCountry)}</span>
              <span className="text-[#8B8BA7]">{partnerCountry}</span>
            </div>
          )}
          {prefRemaining && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-xs font-bold text-purple-300">
              <Sparkles className="w-3 h-3 text-[#EC4899]" />
              <span>Preference: {prefRemaining}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {callState === 'connected' && (
            <div className="flex items-center gap-2 px-3 py-1 bg-[#1A1A26] rounded-full text-xs font-mono font-bold text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {formatDuration(duration)}
            </div>
          )}

          {/* Face Tokens Balance Display */}
          <CoinDisplay />

          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-2 rounded-xl border transition relative ${
              showChat
                ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-white'
                : 'bg-[#1A1A26] border-[#2A2A3A] text-[#8B8BA7] hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Guest Time Warning Banner */}
      <GuestWarningBanner />

      {/* Main Video Viewport */}
      <div className="flex-1 relative bg-black flex overflow-hidden">
        {/* Remote Video Container */}
        <div className="flex-1 relative flex items-center justify-center bg-[#07070A]">
          {/* Searching / Connecting State Overlays */}
          {callState === 'searching' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0A0A0F] text-center p-6">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/40 animate-ping absolute inset-0" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] flex items-center justify-center relative shadow-[0_0_40px_rgba(124,58,237,0.5)]">
                  <Globe className="w-10 h-10 text-white animate-spin-slow" />
                </div>
              </div>
              <h2 className="text-xl font-extrabold text-white mb-2">
                Finding someone new...
              </h2>
              <p className="text-xs text-[#8B8BA7] max-w-sm mb-6 leading-relaxed">
                Connecting you face-to-face with strangers around the world.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => socketRef.current?.emit('simulate_stranger')}
                  className="px-4 py-2 bg-[#1A1A26] border border-[#2A2A3A] text-xs font-semibold text-[#8B8BA7] hover:text-white rounded-xl transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#EC4899]" />
                  <span>Instant Match Preview</span>
                </button>
              </div>
            </div>
          )}

          {callState === 'connecting' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0A0A0F] text-center p-6">
              <Loader2 className="w-12 h-12 text-[#EC4899] animate-spin mb-4" />
              <h2 className="text-lg font-bold text-white mb-1">
                Connecting to {partnerCountry}...
              </h2>
              <p className="text-xs text-[#8B8BA7]">Establishing encrypted peer-to-peer video stream</p>
            </div>
          )}

          {/* Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${callState !== 'connected' ? 'hidden' : ''}`}
          />

          {/* Local PiP Video (Always On) */}
          <div className="absolute bottom-20 right-4 z-20 w-36 h-48 sm:w-44 sm:h-56 bg-[#111118] rounded-2xl overflow-hidden border-2 border-[#2A2A3A] shadow-2xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-[10px] text-white font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              You
            </div>
          </div>
        </div>

        {/* Text Chat Drawer */}
        <TextChat
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          messages={chatMessages}
          onSendMessage={handleSendMessage}
        />
      </div>

      {/* Bottom Controls Bar */}
      <div className="h-20 bg-[#111118] border-t border-[#2A2A3A] px-4 flex items-center justify-between z-30">
        {/* Left Safety Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReport(true)}
            className="p-3 bg-[#1A1A26] border border-[#2A2A3A] text-[#8B8BA7] hover:text-red-400 rounded-2xl transition"
            title="Report Stranger"
          >
            <Flag className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowBlock(true)}
            className="p-3 bg-[#1A1A26] border border-[#2A2A3A] text-[#8B8BA7] hover:text-red-400 rounded-2xl transition"
            title="Block User"
          >
            <Ban className="w-5 h-5" />
          </button>
        </div>

        {/* Center Primary Action Controls */}
        <div className="flex items-center gap-3">
          {/* Microphone toggle */}
          <button
            onClick={toggleMic}
            className={`p-3.5 rounded-2xl border transition ${
              isMuted
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : 'bg-[#1A1A26] border-[#2A2A3A] text-white hover:bg-[#2A2A3A]'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Prominent NEXT Button */}
          <button
            onClick={handleNext}
            className="px-6 py-3.5 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-extrabold rounded-2xl flex items-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.5)] hover:shadow-[0_0_30px_rgba(236,72,153,0.7)] active:scale-95 transition"
          >
            <span>NEXT</span>
            <SkipForward className="w-5 h-5 fill-white" />
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="p-3.5 bg-red-600/20 border border-red-600/40 text-red-400 hover:bg-red-600 hover:text-white rounded-2xl transition"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

        {/* Right Star Rating quick button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRating(true)}
            className="p-3 bg-[#1A1A26] border border-[#2A2A3A] text-amber-400 hover:bg-[#2A2A3A] rounded-2xl transition"
            title="Rate Conversation"
          >
            <Star className="w-5 h-5 fill-amber-400/20" />
          </button>
        </div>
      </div>

      {/* Safety & Moderation Modals */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        conversationId={activeConversationId}
      />
      <BlockModal
        isOpen={showBlock}
        onClose={() => setShowBlock(false)}
        conversationId={activeConversationId}
        onBlockConfirmed={() => handleNext()}
      />

      {/* Star Rating Modal at End of Call */}
      <RatingModal
        isOpen={showRating}
        onClose={() => setShowRating(false)}
        conversationId={lastFinishedConvId || activeConversationId}
        partnerId={partnerId}
        partnerCountry={partnerCountry}
      />

      {/* Guest Expired Modal */}
      <GuestExpiredModal
        isOpen={showGuestExpired}
        onClose={() => router.push('/auth/signup')}
      />
    </div>
  );
}
