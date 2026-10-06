import { query } from './index';
import { logger } from '../utils/logger';

export async function migrate(): Promise<void> {
  logger.info('Running database migrations...');

  // Enable UUID extension
  await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  // Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE,
      password_hash VARCHAR(255),
      google_id VARCHAR(255) UNIQUE,
      display_name VARCHAR(100),
      avatar_url TEXT,
      country VARCHAR(10),
      languages TEXT[] DEFAULT '{}',
      interests TEXT[] DEFAULT '{}',
      is_email_verified BOOLEAN DEFAULT false,
      email_verification_token VARCHAR(255),
      password_reset_token VARCHAR(255),
      password_reset_expires TIMESTAMPTZ,
      gender VARCHAR(20) DEFAULT 'prefer_not_to_say',
      is_admin BOOLEAN DEFAULT false,
      is_banned BOOLEAN DEFAULT false,
      ban_reason TEXT,
      ban_expires_at TIMESTAMPTZ,
      star_rating NUMERIC(3,2) DEFAULT 5.0,
      verified_seconds INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Guest sessions (15-min cumulative server limit)
  await query(`
    CREATE TABLE IF NOT EXISTS guest_sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      session_token VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(100),
      country VARCHAR(10),
      gender VARCHAR(20) DEFAULT 'prefer_not_to_say',
      is_age_confirmed BOOLEAN DEFAULT false,
      ip_address INET,
      user_agent TEXT,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      converted_user_id UUID REFERENCES users(id),
      total_minutes_used INTEGER DEFAULT 0,
      last_active_at TIMESTAMPTZ DEFAULT NOW(),
      fingerprint VARCHAR(255),
      is_active BOOLEAN DEFAULT true
    )
  `);

  // Wallets (Face Tokens)
  await query(`
    CREATE TABLE IF NOT EXISTS wallets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
      total_earned INTEGER DEFAULT 0,
      total_spent INTEGER DEFAULT 0,
      total_purchased INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Wallet transactions (Face Tokens Ledger)
  await query(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      transaction_type VARCHAR(40) NOT NULL,
      balance_after INTEGER NOT NULL,
      conversation_id UUID,
      reference_id VARCHAR(255),
      description TEXT,
      metadata JSONB DEFAULT '{}',
      idempotency_key VARCHAR(255) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Conversations
  await query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_a_id UUID REFERENCES users(id),
      user_b_id UUID REFERENCES users(id),
      guest_a_session_id UUID REFERENCES guest_sessions(id),
      guest_b_session_id UUID REFERENCES guest_sessions(id),
      status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','connecting','active','ended','error')),
      started_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      duration_seconds INTEGER DEFAULT 0,
      ended_by VARCHAR(20),
      end_reason VARCHAR(50),
      coins_earned_a INTEGER DEFAULT 0,
      coins_earned_b INTEGER DEFAULT 0,
      coins_spent_a INTEGER DEFAULT 0,
      coins_spent_b INTEGER DEFAULT 0,
      match_preference VARCHAR(30) DEFAULT 'anyone',
      quality_score INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Token purchases (1,000 Face Tokens for $4 USD)
  await query(`
    CREATE TABLE IF NOT EXISTS coin_purchases (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id),
      stripe_session_id VARCHAR(255) UNIQUE NOT NULL,
      stripe_payment_intent_id VARCHAR(255),
      amount_usd DECIMAL(10,2) NOT NULL,
      coins_amount INTEGER NOT NULL,
      status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
      completed_at TIMESTAMPTZ,
      refunded_at TIMESTAMPTZ,
      idempotency_key VARCHAR(255) UNIQUE NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Subscriptions (legacy / direct purchase record)
  await query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id),
      product_type VARCHAR(50) NOT NULL,
      stripe_session_id VARCHAR(255) UNIQUE NOT NULL,
      stripe_payment_intent_id VARCHAR(255),
      amount_usd DECIMAL(10,2) NOT NULL,
      status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','active','expired','refunded','cancelled')),
      start_time TIMESTAMPTZ,
      expiry_time TIMESTAMPTZ,
      payment_reference VARCHAR(255),
      idempotency_key VARCHAR(255) UNIQUE NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // FaceChat Preference Passes (Time Banking: 5 hours = 18,000 seconds, only used when in preferred call)
  await query(`
    CREATE TABLE IF NOT EXISTS preference_passes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID UNIQUE NOT NULL REFERENCES users(id),
      total_seconds_granted INTEGER NOT NULL DEFAULT 18000,
      remaining_seconds INTEGER NOT NULL DEFAULT 18000,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // FaceChat Star Ratings (1-5 stars)
  await query(`
    CREATE TABLE IF NOT EXISTS star_ratings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id UUID REFERENCES conversations(id),
      rater_user_id UUID NOT NULL REFERENCES users(id),
      rated_user_id UUID NOT NULL REFERENCES users(id),
      stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
      feedback_tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Active Member & Creator Profiles ($1/hour eligible earnings, 750h threshold)
  await query(`
    CREATE TABLE IF NOT EXISTS creator_profiles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID UNIQUE NOT NULL REFERENCES users(id),
      status VARCHAR(20) DEFAULT 'none',
      verified_hours NUMERIC(10,2) DEFAULT 0,
      eligible_preference_hours NUMERIC(10,2) DEFAULT 0,
      pending_payout_usd NUMERIC(10,2) DEFAULT 0,
      paid_out_usd NUMERIC(10,2) DEFAULT 0,
      kyc_status VARCHAR(20) DEFAULT 'unsubmitted',
      payout_method VARCHAR(50),
      payout_details TEXT,
      applied_at TIMESTAMPTZ DEFAULT NOW(),
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Preferred Partner Bookings ($5 for 7 days / up to 60 mins)
  await query(`
    CREATE TABLE IF NOT EXISTS partner_bookings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      requester_id UUID NOT NULL REFERENCES users(id),
      partner_id UUID NOT NULL REFERENCES users(id),
      status VARCHAR(20) DEFAULT 'requested',
      amount_usd NUMERIC(10,2) DEFAULT 5.00,
      partner_revenue_usd NUMERIC(10,2) DEFAULT 2.50,
      platform_revenue_usd NUMERIC(10,2) DEFAULT 2.50,
      minutes_used INTEGER DEFAULT 0,
      max_minutes INTEGER DEFAULT 60,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Loyalty Program Progress (Daily activity tracking)
  await query(`
    CREATE TABLE IF NOT EXISTS loyalty_progress (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID UNIQUE NOT NULL REFERENCES users(id),
      consecutive_days INTEGER DEFAULT 0,
      last_active_date VARCHAR(20),
      today_minutes INTEGER DEFAULT 0,
      total_verified_minutes INTEGER DEFAULT 0,
      current_milestone_tier INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Loyalty Rewards Claims
  await query(`
    CREATE TABLE IF NOT EXISTS loyalty_rewards (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id),
      milestone_days INTEGER NOT NULL,
      reward_type VARCHAR(100) NOT NULL,
      status VARCHAR(20) DEFAULT 'eligible',
      shipping_name VARCHAR(100),
      shipping_address TEXT,
      shipping_country VARCHAR(50),
      tracking_number VARCHAR(100),
      claimed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Matchmaking preferences
  await query(`
    CREATE TABLE IF NOT EXISTS matchmaking_preferences (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID UNIQUE NOT NULL REFERENCES users(id),
      preference VARCHAR(30) DEFAULT 'anyone' CHECK (preference IN ('anyone','female','male')),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Reports
  await query(`
    CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      reporter_user_id UUID REFERENCES users(id),
      reporter_guest_session_id UUID REFERENCES guest_sessions(id),
      reported_user_id UUID REFERENCES users(id),
      reported_guest_session_id UUID REFERENCES guest_sessions(id),
      conversation_id UUID REFERENCES conversations(id),
      reason VARCHAR(100) NOT NULL,
      description TEXT,
      status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','reviewed','actioned','dismissed')),
      reviewed_by UUID REFERENCES users(id),
      reviewed_at TIMESTAMPTZ,
      action_taken TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Blocks
  await query(`
    CREATE TABLE IF NOT EXISTS blocks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      blocker_user_id UUID REFERENCES users(id),
      blocker_guest_session_id UUID REFERENCES guest_sessions(id),
      blocked_user_id UUID REFERENCES users(id),
      blocked_guest_session_id UUID REFERENCES guest_sessions(id),
      conversation_id UUID REFERENCES conversations(id),
      block_type VARCHAR(20) DEFAULT 'session' CHECK (block_type IN ('session','permanent')),
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Abuse events
  await query(`
    CREATE TABLE IF NOT EXISTS abuse_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id),
      guest_session_id UUID REFERENCES guest_sessions(id),
      event_type VARCHAR(100) NOT NULL,
      severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
      metadata JSONB DEFAULT '{}',
      ip_address INET,
      resolved BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Analytics events
  await query(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_name VARCHAR(100) NOT NULL,
      user_id UUID REFERENCES users(id),
      guest_session_id UUID REFERENCES guest_sessions(id),
      anonymous_id VARCHAR(255),
      properties JSONB DEFAULT '{}',
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // User stats
  await query(`
    CREATE TABLE IF NOT EXISTS user_stats (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID UNIQUE NOT NULL REFERENCES users(id),
      total_conversations INTEGER DEFAULT 0,
      total_conversation_minutes INTEGER DEFAULT 0,
      verified_seconds INTEGER DEFAULT 0,
      countries_encountered TEXT[] DEFAULT '{}',
      people_met_today INTEGER DEFAULT 0,
      last_daily_reset TIMESTAMPTZ DEFAULT NOW(),
      conversation_streak INTEGER DEFAULT 0,
      last_streak_date DATE,
      login_streak INTEGER DEFAULT 0,
      last_login_date DATE,
      star_rating NUMERIC(3,2) DEFAULT 5.0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_conversations_user_a ON conversations(user_a_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_conversations_user_b ON conversations(user_b_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_guest_sessions_token ON guest_sessions(session_token)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_star_ratings_rated ON star_ratings(rated_user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_creator_profiles_user ON creator_profiles(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_partner_bookings_partner ON partner_bookings(partner_id)`);

  logger.info('Database migrations completed successfully');
}

// Run if called directly
if (require.main === module) {
  import('../config').then(({ config }) => {
    migrate()
      .then(() => {
        logger.info('Migration complete');
        process.exit(0);
      })
      .catch((err) => {
        logger.error('Migration failed', err);
        process.exit(1);
      });
  });
}
