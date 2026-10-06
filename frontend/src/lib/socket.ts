import { io, Socket } from 'socket.io-client'

export function getWsUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('facechat_backend_url');
    if (custom) return custom.replace(/\/+$/, '');

    const envUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (envUrl && !envUrl.includes('localhost')) {
      return envUrl.replace(/\/+$/, '');
    }

    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      if (window.location.hostname.includes('onrender.com')) {
        return 'https://facechat-backend-5dbq.onrender.com';
      }
      return `${window.location.protocol}//${window.location.host}`;
    }
  }
  return process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
}

let socket: Socket | null = null

export function getSocket(): Socket | null {
  return socket
}

export function connect(token?: string, guestToken?: string): Socket {
  if (socket?.connected) return socket

  const auth: Record<string, string> = {}
  const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('facechat_token') || undefined : undefined);
  if (activeToken) auth.token = activeToken
  if (guestToken) auth.guestToken = guestToken

  socket = io(getWsUrl(), {
    withCredentials: true,
    auth,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
  })

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message)
  })

  return socket
}

export function disconnect() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// ─── Event Type Definitions ───────────────────────────────────────────────────

export type SocketEventMap = {
  // Matchmaking
  'match:searching': void
  'match:found': {
    conversationId: string
    peerId: string
    partner: { id: string; displayName?: string; country?: string; flagEmoji?: string }
    iceServers: RTCIceServer[]
  }
  'match:cancelled': void

  // WebRTC signaling
  'webrtc:offer': { sdp: RTCSessionDescriptionInit; from: string }
  'webrtc:answer': { sdp: RTCSessionDescriptionInit; from: string }
  'webrtc:ice-candidate': { candidate: RTCIceCandidateInit; from: string }

  // Chat
  'chat:message': { id: string; content: string; senderId: string; timestamp: number }
  'chat:typing': { senderId: string }

  // Call lifecycle
  'call:peer-left': { conversationId: string }
  'call:ended': { conversationId: string; coinsEarned: number }

  // Coins
  'coins:earned': { amount: number; newBalance: number }
  'coins:low': { balance: number }
  'coins:zero': void

  // Guest
  'guest:time-update': { remaining: number }
  'guest:expired': void
}

export function emit<K extends keyof SocketEventMap>(
  event: K,
  data?: SocketEventMap[K]
) {
  socket?.emit(event, data)
}

export function on<K extends keyof SocketEventMap>(
  event: K,
  handler: (data: SocketEventMap[K]) => void
) {
  socket?.on(event as string, handler as (...args: unknown[]) => void)
}

export function off<K extends keyof SocketEventMap>(
  event: K,
  handler?: (data: SocketEventMap[K]) => void
) {
  if (handler) {
    socket?.off(event as string, handler as (...args: unknown[]) => void)
  } else {
    socket?.off(event as string)
  }
}
