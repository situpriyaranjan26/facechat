import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './utils/logger';
import { testConnection } from './db';
import { migrate } from './db/migrate';
import { getRedis } from './utils/redis';
import { initSignalingServer } from './websocket/signalingServer';

// Routes
import authRoutes from './modules/auth/authRoutes';
import userRoutes from './modules/users/userRoutes';
import walletRoutes from './modules/wallet/walletRoutes';
import paymentRoutes from './modules/payments/paymentRoutes';
import subscriptionRoutes from './modules/subscriptions/subscriptionRoutes';
import conversationRoutes from './modules/conversations/conversationRoutes';
import reportRoutes from './modules/reports/reportRoutes';
import moderationRoutes from './modules/moderation/moderationRoutes';
import guestRoutes from './modules/security/guestRoutes';
import analyticsRoutes from './modules/analytics/analyticsRoutes';
import ratingRoutes from './modules/ratings/ratingRoutes';
import creatorRoutes from './modules/creators/creatorRoutes';
import partnerRoutes from './modules/partners/partnerRoutes';
import loyaltyRoutes from './modules/loyalty/loyaltyRoutes';
import adRoutes from './modules/ads/adRoutes';
import adminRoutes from './routes/admin';
import iceConfigRoutes from './routes/iceConfig';

const app = express();
const server = http.createServer(app);

// Security & Parsing Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow any origin in production (reflect origin) so Vercel, Render, and custom domains connect without CORS blocks
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-guest-token', 'x-admin-secret'],
}));

// Stripe webhook needs raw body, mount before json parser
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'FaceChat Backend', timestamp: new Date() });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ice', iceConfigRoutes);

// Centralized Config endpoint for client
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      // Guest usage
      guestFreeMinutes: config.business.guestFreeMinutes,
      guestWarningMinutes: config.business.guestWarningMinutes,

      // Token economy
      initialFaceTokens: config.business.initialFaceTokens,
      tokensSpentPerMinute: config.business.tokensSpentPerMinute,
      instantSkipThresholdSeconds: config.business.instantSkipThresholdSeconds,
      instantSkipPenalty: config.business.instantSkipPenalty,
      minimumRewardDurationSeconds: config.business.minimumRewardDurationSeconds,
      baseConversationReward: config.business.baseConversationReward,
      additionalMinuteReward: config.business.additionalMinuteReward,
      tokenBundleAmount: config.business.tokenBundleAmount,
      tokenBundlePriceUsd: config.business.tokenBundlePriceUsd,

      // Preference Pass
      preferencePassPriceUsd: config.business.preferencePassPriceUsd,
      preferencePassDurationHours: config.business.preferencePassDurationHours,

      // Creator & Partner
      activeMemberMinHours: config.business.activeMemberMinHours,
      creatorRateUsdPerHour: config.business.creatorRateUsdPerHour,
      partnerPassPriceUsd: config.business.partnerPassPriceUsd,
      partnerTotalMinutes: config.business.partnerTotalMinutes,
      partnerPassDurationDays: config.business.partnerPassDurationDays,

      // Ads & Milestones
      adsAfterHours: config.business.adsAfterHours,
      loyaltyMilestones: config.business.loyaltyMilestones,
    },
  });
});

// Initialize WebSocket WebRTC Signaling Server
initSignalingServer(server);

// Start Server
async function startServer() {
  try {
    logger.info('Connecting to database...');
    await testConnection();
    await migrate();

    try {
      await getRedis();
    } catch (e) {
      logger.warn('Redis connection failed, continuing with in-memory fallbacks', e);
    }

    server.listen(config.server.port, () => {
      logger.info(`FaceChat Backend running on port ${config.server.port}`);
      logger.info(`Frontend URL configured: ${config.server.frontendUrl}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();

export { app, server };
