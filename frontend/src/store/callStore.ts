import { create } from 'zustand'
import type { CallStatus, ChatMessage, ConversationPartner } from '@/types'

interface CallState {
  status: CallStatus
  conversationId: string | null
  peerId: string | null
  partner: ConversationPartner | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isMuted: boolean
  isCameraOff: boolean
  chatMessages: ChatMessage[]
  duration: number
  coinsEarnedThisSession: number
  connectionQuality: 'good' | 'fair' | 'poor' | null

  setStatus: (s: CallStatus) => void
  setConversationId: (id: string | null) => void
  setPeerId: (id: string | null) => void
  setPartner: (partner: ConversationPartner | null) => void
  setLocalStream: (stream: MediaStream | null) => void
  setRemoteStream: (stream: MediaStream | null) => void
  setStreams: (local: MediaStream | null, remote: MediaStream | null) => void
  toggleMute: () => void
  toggleCamera: () => void
  addChatMessage: (msg: ChatMessage) => void
  clearChatMessages: () => void
  incrementDuration: () => void
  resetDuration: () => void
  setCoinsEarned: (coins: number) => void
  setConnectionQuality: (q: 'good' | 'fair' | 'poor' | null) => void
  resetCall: () => void
}

export const useCallStore = create<CallState>((set, get) => ({
  status: 'idle',
  conversationId: null,
  peerId: null,
  partner: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  chatMessages: [],
  duration: 0,
  coinsEarnedThisSession: 0,
  connectionQuality: null,

  setStatus: (s) => set({ status: s }),
  setConversationId: (id) => set({ conversationId: id }),
  setPeerId: (id) => set({ peerId: id }),
  setPartner: (partner) => set({ partner }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setStreams: (local, remote) => set({ localStream: local, remoteStream: remote }),

  toggleMute: () => {
    const { localStream, isMuted } = get()
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = isMuted))
    }
    set({ isMuted: !isMuted })
  },

  toggleCamera: () => {
    const { localStream, isCameraOff } = get()
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = isCameraOff))
    }
    set({ isCameraOff: !isCameraOff })
  },

  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),

  clearChatMessages: () => set({ chatMessages: [] }),

  incrementDuration: () =>
    set((state) => ({ duration: state.duration + 1 })),

  resetDuration: () => set({ duration: 0 }),

  setCoinsEarned: (coins) => set({ coinsEarnedThisSession: coins }),

  setConnectionQuality: (q) => set({ connectionQuality: q }),

  resetCall: () =>
    set({
      status: 'idle',
      conversationId: null,
      peerId: null,
      partner: null,
      remoteStream: null,
      chatMessages: [],
      duration: 0,
      coinsEarnedThisSession: 0,
      connectionQuality: null,
    }),
}))
