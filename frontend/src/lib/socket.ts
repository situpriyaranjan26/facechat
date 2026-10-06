import { io, Socket } from 'socket.io-client'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  return socket
}

export function connect(token?: string, guestToken?: string): Socket {
  if (socket?.connected) return socket

  const auth: Record<string, string> = {}
  if (token) auth.token = token
  if (guestToken) auth.guestToken = guestToken

  socket = io(WS_URL, {
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
