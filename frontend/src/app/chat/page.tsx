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

function createSimulatedStrangerStream(country: string): MediaStream {
  if (typeof document === 'undefined') return new MediaStream();
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  let frame = 0;

  const draw = () => {
    if (!ctx) return;
    frame++;

    // Gradient Background
    const grad = ctx.createLinearGradient(0, 0, 640, 480);
    grad.addColorStop(0, '#0D0D14');
    grad.addColorStop(1, '#1A1A2E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    // Dynamic wave ripples
    const pulse = Math.sin(frame * 0.08) * 12;
    ctx.beginPath();
    ctx.arc(320, 200, 75 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(124, 58, 237, 0.25)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#EC4899';
    ctx.stroke();

    // Inner avatar glow
    ctx.beginPath();
    ctx.arc(320, 200, 50, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
    ctx.fill();

    // Smiley face / avatar eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(305, 190, 6, 0, Math.PI * 2);
    ctx.arc(335, 190, 6, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.beginPath();
    ctx.arc(320, 205, 18, 0.2, Math.PI - 0.2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Sound bar indicators
    for (let i = 0; i < 7; i++) {
      const h = Math.abs(Math.sin((frame + i * 15) * 0.1)) * 25 + 6;
      ctx.fillStyle = '#06B6D4';
      ctx.fillRect(260 + i * 18, 300 - h / 2, 8, h);
    }

    // Country & status badge
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Stranger from ${country}`, 320, 360);

    ctx.fillStyle = '#10B981';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('● Live Video Connected • Say Hello Below!', 320, 395);

    requestAnimationFrame(draw);
  };
  draw();

  return canvas.captureStream(30);
}

export default function ChatPage() {
  const router = useRouter();
  const { user, isAuthenticated, isGuest, guestToken, guestTimeRemaining, guestWarning } = useAuthStore();
  const { balance, setBalance, fetchBalance } = useWalletStore();

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
  const [showZeroModal, setShowZeroModal] = useState(false);
  const [rewardNotification, setRewardNotification] = useState<{
    id: number;
    type: 'reward' | 'penalty';
    text: string;
    sub: string;
  } | null>(null);
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

  useEffect(() => {
    if (rewardNotification) {
      const t = setTimeout(() => setRewardNotification(null), 3800);
      return () => clearTimeout(t);
    }
  }, [rewardNotification]);

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

    socket.on('matched', async (data: { conversationId: string; isInitiator: boolean; partnerCountry: string; partnerId?: string; isSimulated?: boolean }) => {
      setActiveConversationId(data.conversationId);
      setPartnerCountry(data.partnerCountry || 'Global');
      setPartnerId(data.partnerId || null);

      if (data.isSimulated) {
        // Instant preview mode
        setCallState('connected');
        startTimer();
        const simStream = createSimulatedStrangerStream(data.partnerCountry || 'Global');
        setRemoteStream(simStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = simStream;
          remoteVideoRef.current.play().catch(console.warn);
        }
        setShowChat(true);
        return;
      }

      setCallState('connecting');

      await rtc.createPeerConnection();
      rtc.addLocalStream(stream);

      rtc.setOnIceCandidate((candidate) => {
        socket.emit('ice_candidate', { candidate });
      });

      if (data.isInitiator) {
        try {
          const offer = await rtc.createOffer();
          socket.emit('offer', { sdp: offer });
        } catch (err) {
          console.error('[WebRTC] Error creating offer:', err);
        }
      }
    });

    socket.on('offer', async (data: { sdp: any }) => {
      try {
        if (!rtc.isInitialized()) {
          await rtc.createPeerConnection();
          rtc.addLocalStream(stream);
          rtc.setOnIceCandidate((candidate) => {
            socket.emit('ice_candidate', { candidate });
          });
        }

        const answer = await rtc.handleOffer(data.sdp);
        socket.emit('answer', { sdp: answer });
        setCallState('connected');
        startTimer();
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err);
      }
    });

    socket.on('answer', async (data: { sdp: any }) => {
      try {
        await rtc.handleAnswer(data.sdp);
        setCallState('connected');
        startTimer();
      } catch (err) {
        console.error('[WebRTC] Error handling answer:', err);
      }
    });

    socket.on('ice_candidate', async (data: { candidate: any }) => {
      await rtc.addIceCandidate(data.candidate);
    });

    socket.on('chat_message', (data: { text: string; sender: 'peer'; timestamp: number }) => {
      setChatMessages((prev) => [...prev, data]);
      setShowChat(true);
      toast(`Message: "${data.text}"`, { icon: '💬', duration: 4000 });
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

    socket.on('token_balance', (data: { balance: number }) => {
      setBalance(data.balance);
    });

    socket.on('token_reward', (data: { amount: number; balance: number; message?: string }) => {
      setBalance(data.balance);
      setRewardNotification({
        id: Date.now(),
        type: 'reward',
        text: `+${data.amount} Face Token! 🪙`,
        sub: '1-min call reward',
      });
      toast.success(data.message || '+1 Face Token earned! 🪙', {
        icon: '🪙',
        duration: 3500,
      });
    });

    socket.on('token_penalty', (data: { amount: number; balance: number; message?: string }) => {
      setBalance(data.balance);
      setRewardNotification({
        id: Date.now(),
        type: 'penalty',
        text: `-${data.amount} Tokens ⚠️`,
        sub: 'Skip penalty applied',
      });
      toast(data.message || '-2 Tokens (Skip penalty)', {
        icon: '⚠️',
        duration: 3000,
      });
    });

    socket.on('zero_coins', (data: { message: string; balance?: number }) => {
      setBalance(0);
      setCallState('ended');
      setShowZeroModal(true);
      toast.error(data.message || 'You need Face Tokens to talk! Refill at the wallet.');
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
    if (balance <= 0) {
      setShowZeroModal(true);
      return;
    }
    if (socketRef.current) {
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
          <CoinDisplay
            balance={balance}
            onClick={() => router.push('/wallet')}
          />

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

      {/* Animated Token Reward / Penalty Floating Banner */}
      {rewardNotification && (
        <div
          key={rewardNotification.id}
          className={`absolute top-16 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl backdrop-blur-xl border shadow-2xl flex items-center gap-3 animate-bounce transition-all ${
            rewardNotification.type === 'reward'
              ? 'bg-gradient-to-r from-amber-500/95 via-yellow-400/95 to-amber-600/95 border-yellow-300 text-black shadow-[0_0_35px_rgba(251,191,36,0.7)]'
              : 'bg-red-600/95 border-red-400 text-white shadow-[0_0_25px_rgba(239,68,68,0.6)]'
          }`}
        >
          <span className="text-2xl">{rewardNotification.type === 'reward' ? '🪙' : '⚠️'}</span>
          <div>
            <div className="font-black text-sm tracking-wide">{rewardNotification.text}</div>
            <div className="text-[10px] font-bold opacity-90">{rewardNotification.sub}</div>
          </div>
        </div>
      )}

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

          {/* Remote Video (always decoded in DOM) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              callState === 'connected' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          />

          {/* Floating Chat Bubbles over video so messages are always visible */}
          {!showChat && chatMessages.length > 0 && callState === 'connected' && (
            <div className="absolute bottom-24 left-6 z-20 max-w-sm space-y-2 pointer-events-none">
              {chatMessages.slice(-2).map((msg, i) => (
                <div
                  key={i}
                  className="px-4 py-2 rounded-2xl backdrop-blur-md bg-black/75 border border-white/15 text-white text-xs shadow-lg"
                >
                  <span className="font-bold text-[#EC4899] mr-1.5">
                    {msg.sender === 'me' ? 'You:' : `${partnerCountry}:`}
                  </span>
                  <span>{msg.text}</span>
                </div>
              ))}
            </div>
          )}

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

          {/* Prominent Chat button */}
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-3.5 rounded-2xl border transition relative flex items-center gap-1.5 ${
              showChat
                ? 'bg-[#7C3AED] border-[#7C3AED] text-white shadow-[0_0_15px_rgba(124,58,237,0.5)]'
                : 'bg-[#1A1A26] border-[#2A2A3A] text-[#8B8BA7] hover:text-white hover:bg-[#2A2A3A]'
            }`}
            title="Toggle Text Chat"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-xs font-bold hidden sm:inline">Chat</span>
            {chatMessages.length > 0 && !showChat && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#EC4899] rounded-full animate-ping" />
            )}
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

      {/* Strict Zero Tokens Modal */}
      {showZeroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#111118] border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(245,158,11,0.25)] text-center animate-in zoom-in-95">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/10 border-2 border-amber-400/40 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(245,158,11,0.3)] animate-pulse">
              🪙
            </div>
            <h3 className="text-2xl font-black text-white mb-2 tracking-wide">
              You Have 0 Face Tokens!
            </h3>
            <p className="text-sm text-[#8B8BA7] mb-6 leading-relaxed">
              FaceChat requires at least 1 Face Token to talk to strangers. Refill your tokens now or get the bundle to keep conversations flowing!
            </p>

            <div className="bg-[#1A1A26] rounded-2xl p-4 border border-[#2A2A3A] mb-6 flex items-center justify-between">
              <div className="text-left">
                <div className="font-extrabold text-white text-base">Popular Refill Bundle</div>
                <div className="text-xs text-amber-400 font-bold">1,000 Face Tokens</div>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-white">$4.00</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/wallet')}
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold rounded-2xl transition shadow-[0_0_30px_rgba(245,158,11,0.5)] active:scale-95"
              >
                Refill Tokens Now (1,000 Tokens) ⚡
              </button>
              <button
                onClick={() => setShowZeroModal(false)}
                className="w-full py-3 bg-[#1A1A26] hover:bg-[#252538] text-[#8B8BA7] hover:text-white font-bold rounded-2xl border border-[#2A2A3A] transition text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
