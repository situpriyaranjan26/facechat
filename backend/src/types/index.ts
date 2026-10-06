// =====================================================================
// FaceChat Backend – Shared TypeScript Types
// =====================================================================

export type Gender = 'male' | 'female' | 'prefer_not_to_say';
export type MatchPreference = 'anyone' | 'female' | 'male';
export type ConversationStatus = 'pending' | 'connecting' | 'active' | 'ended' | 'error';
export type TransactionType =
  | 'CONVERSATION_SPEND'
  | 'CONVERSATION_REWARD'
  | 'SKIP_PENALTY'
  | 'PURCHASE'
  | 'BONUS'
  | 'REFUND'
  | 'ADMIN_ADJUSTMENT'
  | 'PARTNER_BOOKING'
  | 'CREATOR_PAYOUT'
  // Backwards compatibility aliases
  | 'EARN'
  | 'SPEND';

export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';
export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'refunded' | 'cancelled';
export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type AbuseSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BlockType = 'session' | 'permanent';
export type CreatorStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'suspended';
export type BookingStatus = 'requested' | 'accepted' | 'declined' | 'completed' | 'expired';

// -----------------------------------------------------------------------
// User
// -----------------------------------------------------------------------
export interface User {
  id: string;
  email: string | null;
  passwordHash: string | null;
  googleId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  country: string | null;
  languages: string[];
  interests: string[];
  isEmailVerified: boolean;
  emailVerificationToken: string | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  gender: Gender;
  isAdmin: boolean;
  isBanned: boolean;
  banReason: string | null;
  banExpiresAt: Date | null;
  starRating?: number;
  verifiedSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
}

export interface UserPublicProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  country: string | null;
  languages: string[];
  interests: string[];
  gender: Gender;
  starRating?: number;
  isCreator?: boolean;
  isInfluencer?: boolean;
  createdAt: Date;
}

export interface UserStats {
  id: string;
  userId: string;
  totalConversations: number;
  totalConversationMinutes: number;
  verifiedSeconds: number;
  countriesEncountered: string[];
  peoplemetToday: number;
  conversationStreak: number;
  loginStreak: number;
  starRating: number;
  updatedAt: Date;
}

// -----------------------------------------------------------------------
// Guest Session
// -----------------------------------------------------------------------
export interface GuestSession {
  id: string;
  sessionToken: string;
  username?: string;
  country?: string;
  gender?: Gender;
  isAgeConfirmed?: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  startedAt: Date;
  expiresAt: Date;
  convertedUserId: string | null;
  totalMinutesUsed: number;
  lastActiveAt: Date;
  fingerprint: string | null;
  tokens?: number;
  isActive: boolean;
}

// -----------------------------------------------------------------------
// Conversation
// -----------------------------------------------------------------------
export interface Conversation {
  id: string;
  userAId: string | null;
  userBId: string | null;
  guestASessionId: string | null;
  guestBSessionId: string | null;
  status: ConversationStatus;
  startedAt: Date | null;
  endedAt: Date | null;
  durationSeconds: number;
  endedBy: string | null;
  endReason: string | null;
  coinsEarnedA: number; // Face Tokens earned
  coinsEarnedB: number;
  coinsSpentA: number;  // Face Tokens spent
  coinsSpentB: number;
  matchPreference: MatchPreference;
  qualityScore: number | null;
  createdAt: Date;
}

// -----------------------------------------------------------------------
// Wallet & Face Tokens Ledger
// -----------------------------------------------------------------------
export interface Wallet {
  id: string;
  userId: string;
  balance: number; // Face Tokens
  totalEarned: number;
  totalSpent: number;
  totalPurchased: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  transactionType: TransactionType;
  balanceAfter: number;
  conversationId: string | null;
  referenceId: string | null;
  description: string | null;
  metadata: Record<string, any>;
  idempotencyKey: string | null;
  createdAt: Date;
}

// -----------------------------------------------------------------------
// Token Purchases
// -----------------------------------------------------------------------
export interface TokenPurchase {
  id: string;
  userId: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  amountUsd: number;
  tokensAmount: number;
  status: PurchaseStatus;
  completedAt: Date | null;
  refundedAt: Date | null;
  idempotencyKey: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

// Legacy alias
export type CoinPurchase = TokenPurchase;

// -----------------------------------------------------------------------
// FaceChat Preference Pass (Time Banking)
// -----------------------------------------------------------------------
export interface PreferencePass {
  id: string;
  userId: string;
  totalSecondsGranted: number;
  remainingSeconds: number; // Time banked, only drained during active preferred calls
  isActive: boolean; // Toggle ON/OFF switch
  updatedAt: Date;
  createdAt: Date;
}

// Legacy subscription interface
export interface Subscription {
  id: string;
  userId: string;
  productType: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  amountUsd: number;
  status: SubscriptionStatus;
  startTime: Date | null;
  expiryTime: Date | null;
  paymentReference: string | null;
  idempotencyKey: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

// -----------------------------------------------------------------------
// FaceChat Star Rating
// -----------------------------------------------------------------------
export interface StarRating {
  id: string;
  conversationId: string;
  raterUserId: string;
  ratedUserId: string;
  stars: number; // 1 to 5
  feedbackTags?: string[];
  createdAt: Date;
}

// -----------------------------------------------------------------------
// Active Member & Creator System ($1/hour on eligible preference calls)
// -----------------------------------------------------------------------
export interface CreatorProfile {
  id: string;
  userId: string;
  status: CreatorStatus;
  verifiedHours: number; // Cumulative verified talk hours (min 750)
  eligiblePreferenceHours: number; // Hours spent on preference calls
  pendingPayoutUsd: number;
  paidOutUsd: number;
  kycStatus: 'unsubmitted' | 'pending' | 'verified' | 'rejected';
  payoutMethod?: string;
  payoutDetails?: string;
  appliedAt: Date;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------------------
// Preferred Partner Booking ($5 for 7 days / up to 60 mins)
// -----------------------------------------------------------------------
export interface PartnerBooking {
  id: string;
  requesterId: string;
  partnerId: string;
  status: BookingStatus;
  amountUsd: number; // 5.00
  partnerRevenueUsd: number; // 2.50
  platformRevenueUsd: number; // 2.50
  minutesUsed: number;
  maxMinutes: number; // 60
  expiresAt: Date; // 7 days from acceptance
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------------------
// Loyalty Milestone Program
// -----------------------------------------------------------------------
export interface LoyaltyProgress {
  id: string;
  userId: string;
  consecutiveDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  todayMinutes: number;
  totalVerifiedMinutes: number;
  currentMilestoneTier: number; // 0, 1, 2, 3, 4
  updatedAt: Date;
}

export interface LoyaltyRewardClaim {
  id: string;
  userId: string;
  milestoneDays: number; // 30, 50, 250, 450
  rewardType: string;
  status: 'eligible' | 'claimed' | 'shipped' | 'delivered';
  shippingName?: string;
  shippingAddress?: string;
  shippingCountry?: string;
  trackingNumber?: string;
  claimedAt: Date;
}

// -----------------------------------------------------------------------
// Reports & Moderation
// -----------------------------------------------------------------------
export interface Report {
  id: string;
  reporterUserId: string | null;
  reporterGuestSessionId: string | null;
  reportedUserId: string | null;
  reportedGuestSessionId: string | null;
  conversationId: string | null;
  reason: string;
  description: string | null;
  status: ReportStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  actionTaken: string | null;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface Block {
  id: string;
  blockerUserId: string | null;
  blockerGuestSessionId: string | null;
  blockedUserId: string | null;
  blockedGuestSessionId: string | null;
  conversationId: string | null;
  blockType: BlockType;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface AbuseEvent {
  id: string;
  userId: string | null;
  guestSessionId: string | null;
  eventType: string;
  severity: AbuseSeverity;
  metadata: Record<string, any>;
  ipAddress: string | null;
  resolved: boolean;
  createdAt: Date;
}

export interface AnalyticsEvent {
  id: string;
  eventName: string;
  userId: string | null;
  guestSessionId: string | null;
  anonymousId: string | null;
  properties: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// -----------------------------------------------------------------------
// Matchmaking Queue
// -----------------------------------------------------------------------
export interface QueueEntry {
  id: string; // userId or guestSessionId
  type: 'user' | 'guest';
  preference: MatchPreference;
  gender: Gender | null;
  country?: string | null;
  socketId: string;
  joinedAt: number; // Unix ms timestamp
  blockedList: string[];
  hasPreferencePass: boolean;
  starRating?: number;
}

export interface MatchmakingPreference {
  id: string;
  userId: string;
  preference: MatchPreference;
  updatedAt: Date;
}

// -----------------------------------------------------------------------
// Express – augmented Request
// -----------------------------------------------------------------------
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: User;
  guestSession?: GuestSession;
}

// -----------------------------------------------------------------------
// Token bundle definitions ($4 for 1,000 Face Tokens)
// -----------------------------------------------------------------------
export type TokenBundleType = 'standard' | 'popular' | 'mega';

export const TOKEN_BUNDLES: Record<TokenBundleType, { tokens: number; priceUsd: number; label: string }> = {
  standard: { tokens: 1000, priceUsd: 4.00, label: '1,000 Face Tokens' },
  popular:  { tokens: 2500, priceUsd: 9.00, label: '2,500 Face Tokens (Best Value)' },
  mega:     { tokens: 6000, priceUsd: 20.00, label: '6,000 Face Tokens' },
};

// Backwards compatibility alias
export const COIN_BUNDLES = TOKEN_BUNDLES;
export type CoinBundleType = TokenBundleType;

export const PREFERENCE_PASS_PRODUCT = 'facechat_preference_pass';
export const PARTNER_BOOKING_PRODUCT = 'facechat_partner_booking';
export const FEMALE_PASS_PRODUCT = 'facechat_preference_pass';
