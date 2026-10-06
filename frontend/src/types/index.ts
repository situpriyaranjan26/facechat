export interface User {
  id: string
  email: string
  displayName: string
  avatar?: string
  role: 'user' | 'admin' | 'moderator'
  country?: string
  gender?: string
  starRating?: number
  languages?: string[]
  interests?: string[]
  isVerified: boolean
  createdAt: string
  stats?: UserStats
  achievements?: Achievement[]
}

export interface UserStats {
  peopleMet: number
  countriesEncountered: number
  totalConversations: number
  currentStreak: number
  longestStreak: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  earnedAt: string
}

export interface WalletTransaction {
  id: string
  type: 'earned' | 'spent' | 'purchased' | 'bonus' | 'refund'
  amount: number
  balanceAfter: number
  description: string
  createdAt: string
  conversationId?: string
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName?: string
  content: string
  timestamp: number
  isOwn: boolean
}

export interface ConversationPartner {
  id: string
  displayName?: string
  country?: string
  city?: string
  flagEmoji?: string
}

export interface IceServer {
  urls: string | string[]
  username?: string
  credential?: string
}

export interface MatchFoundPayload {
  conversationId: string
  peerId: string
  partner: ConversationPartner
  iceServers: IceServer[]
}

export type CallStatus = 'idle' | 'searching' | 'connecting' | 'connected' | 'ended'

export interface FemalePassStatus {
  isActive: boolean
  expiresAt?: string
  hoursRemaining?: number
  minutesRemaining?: number
}

export interface BuyCoinsPackage {
  id: string
  name: string
  coins: number
  price: number
  bonus?: number
  popular?: boolean
}

export interface ReportReason {
  value: string
  label: string
}

export const REPORT_REASONS: ReportReason[] = [
  { value: 'nudity', label: 'Nudity / Sexual content' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate', label: 'Hate speech / Abusive behavior' },
  { value: 'threats', label: 'Threats or violence' },
  { value: 'spam', label: 'Spam / Scam' },
  { value: 'underage', label: 'Underage user' },
  { value: 'suspicious', label: 'Suspicious behavior' },
  { value: 'other', label: 'Other' },
]
