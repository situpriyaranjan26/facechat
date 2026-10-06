import dotenv from 'dotenv';
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '4000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/facechat',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-jwt-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  },
  turn: {
    server: process.env.TURN_SERVER || 'stun:stun.l.google.com:19302',
    username: process.env.TURN_USERNAME || '',
    password: process.env.TURN_PASSWORD || '',
    stunServer: process.env.STUN_SERVER || 'stun:stun.l.google.com:19302',
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'FaceChat <noreply@facechat.app>',
  },
  admin: {
    secret: process.env.ADMIN_SECRET || 'admin-secret-change-me',
  },

  // ============================================================
  // FACECHAT BUSINESS & TOKEN ECONOMY CONFIGURATION
  // ============================================================
  business: {
    // Guest usage limits
    guestFreeMinutes: parseInt(process.env.GUEST_FREE_MINUTES || '15', 10),
    guestWarningMinutes: parseInt(process.env.GUEST_WARNING_MINUTES || '2', 10),

    // Face Token economy
    initialFaceTokens: parseInt(process.env.INITIAL_FACE_TOKENS || '10', 10),
    initialRegisteredFaceTokens: parseInt(process.env.INITIAL_REGISTERED_FACE_TOKENS || '100', 10),
    initialGuestFaceTokens: parseInt(process.env.INITIAL_GUEST_FACE_TOKENS || '10', 10),
    testModeAutoRefillAmount: 10,
    testModeEnabled: true,
    tokensSpentPerMinute: parseInt(process.env.TOKENS_SPENT_PER_MINUTE || '1', 10),

    // Skip penalty: < 2 minutes (120s) intentional skip deducts 2 Face Tokens
    instantSkipThresholdSeconds: parseInt(process.env.INSTANT_SKIP_THRESHOLD_SECONDS || '120', 10),
    instantSkipPenalty: parseInt(process.env.INSTANT_SKIP_PENALTY || '2', 10),

    // Conversation rewards: > 2 minutes earns +5 Face Tokens + 5 tokens per extra minute
    minimumRewardDurationSeconds: parseInt(process.env.MINIMUM_REWARD_DURATION_SECONDS || '120', 10),
    baseConversationReward: parseInt(process.env.BASE_CONVERSATION_REWARD || '5', 10),
    additionalMinuteReward: parseInt(process.env.ADDITIONAL_MINUTE_REWARD || '5', 10),

    // Token purchases: 1,000 Face Tokens for $4 USD
    tokenBundleAmount: parseInt(process.env.TOKEN_BUNDLE_AMOUNT || '1000', 10),
    tokenBundlePriceUsd: parseFloat(process.env.TOKEN_BUNDLE_PRICE_USD || '4.00'),

    // FaceChat Preference Pass: $2 for 5 hours (time-banked, only consumed during active preferred calls)
    preferencePassPriceUsd: parseFloat(process.env.PREFERENCE_PASS_PRICE_USD || '2.00'),
    preferencePassDurationHours: parseInt(process.env.PREFERENCE_PASS_DURATION_HOURS || '5', 10),
    preferencePassSecondsBanked: parseInt(process.env.PREFERENCE_PASS_DURATION_HOURS || '5', 10) * 3600,

    // Active Member & Creator program
    activeMemberMinHours: parseInt(process.env.ACTIVE_MEMBER_MIN_HOURS || '750', 10),
    creatorRateUsdPerHour: parseFloat(process.env.CREATOR_RATE_USD_PER_HOUR || '1.00'),

    // Preferred Partner booking: $5 for 7 days / up to 60 mins ($2.50 partner / $2.50 FaceChat)
    partnerPassPriceUsd: parseFloat(process.env.PARTNER_PASS_PRICE_USD || '5.00'),
    partnerTotalMinutes: parseInt(process.env.PARTNER_TOTAL_MINUTES || '60', 10),
    partnerPassDurationDays: parseInt(process.env.PARTNER_PASS_DURATION_DAYS || '7', 10),
    partnerCreatorSplitUsd: parseFloat(process.env.PARTNER_CREATOR_SPLIT_USD || '2.50'),
    partnerPlatformSplitUsd: parseFloat(process.env.PARTNER_PLATFORM_SPLIT_USD || '2.50'),

    // Advertising threshold for free users (24 verified conversation hours)
    adsAfterHours: parseInt(process.env.ADS_AFTER_HOURS || '24', 10),

    // Loyalty milestone tiers
    loyaltyMilestones: [
      { days: 30, minMinutesPerDay: 15, rewardId: 'mug_tshirt', rewardName: 'FaceChat Mug & Official T-Shirt' },
      { days: 50, minMinutesPerDay: 20, rewardId: 'bomber_jacket', rewardName: 'FaceChat Collector Bomber Jacket' },
      { days: 250, minMinutesPerDay: 30, rewardId: 'creator_gear', rewardName: 'FaceChat Pro Creator Gear Set' },
      { days: 450, minMinutesPerDay: 30, rewardId: 'influencer_fast_track', rewardName: 'FaceChat Official Influencer Fast Track' },
    ],
  },
  rateLimiting: {
    maxMatchesPerHour: parseInt(process.env.MAX_MATCHES_PER_HOUR || '60', 10),
    maxReportsPerHour: parseInt(process.env.MAX_REPORTS_PER_HOUR || '10', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
  },
};

export default config;
