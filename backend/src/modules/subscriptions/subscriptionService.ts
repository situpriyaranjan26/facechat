import { query } from '../../db';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { Subscription, SubscriptionStatus } from '../../types';

function mapSubscription(r: any): Subscription {
  return {
    id: r.id,
    userId: r.user_id,
    productType: r.product_type,
    stripeSessionId: r.stripe_session_id,
    stripePaymentIntentId: r.stripe_payment_intent_id,
    amountUsd: parseFloat(r.amount_usd),
    status: r.status,
    startTime: r.start_time,
    expiryTime: r.expiry_time,
    paymentReference: r.payment_reference,
    idempotencyKey: r.idempotency_key,
    metadata: r.metadata || {},
    createdAt: r.created_at,
  };
}

export const subscriptionService = {
  // ---- Get the latest active subscription for a product -----------------
  async getActiveSubscription(userId: string, productType: string): Promise<Subscription | null> {
    const result = await query<any>(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 AND product_type = $2 AND status = 'active' AND expiry_time > NOW()
       ORDER BY expiry_time DESC LIMIT 1`,
      [userId, productType]
    );
    return result.rows.length ? mapSubscription(result.rows[0]) : null;
  },

  // ---- Boolean check (used for matchmaking gate) -----------------------
  async isSubscriptionActive(userId: string, productType: string): Promise<boolean> {
    const result = await query<any>(
      `SELECT 1 FROM subscriptions
       WHERE user_id = $1 AND product_type = $2 AND status = 'active' AND expiry_time > NOW()
       LIMIT 1`,
      [userId, productType]
    );
    return result.rows.length > 0;
  },

  // ---- Activate a subscription (called after payment confirmed) --------
  async activateSubscription(
    userId: string,
    subscriptionId: string
  ): Promise<Subscription> {
    const durationHours = config.business.preferencePassDurationHours || 5;
    const result = await query<any>(
      `UPDATE subscriptions
       SET status = 'active', start_time = NOW(),
           expiry_time = NOW() + ($1 || ' hours')::INTERVAL
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [durationHours, subscriptionId, userId]
    );
    if (!result.rows.length) {
      throw Object.assign(new Error('Subscription not found'), { statusCode: 404 });
    }
    logger.info('Subscription activated', { userId, subscriptionId });
    return mapSubscription(result.rows[0]);
  },

  // ---- Remaining time in seconds ----------------------------------------
  async getSubscriptionTimeRemaining(userId: string, productType: string): Promise<number> {
    const result = await query<any>(
      `SELECT EXTRACT(EPOCH FROM (expiry_time - NOW())) AS remaining_seconds
       FROM subscriptions
       WHERE user_id = $1 AND product_type = $2 AND status = 'active' AND expiry_time > NOW()
       ORDER BY expiry_time DESC LIMIT 1`,
      [userId, productType]
    );
    if (!result.rows.length) return 0;
    return Math.max(0, Math.floor(result.rows[0].remaining_seconds));
  },

  // ---- Background job: expire stale subscriptions ---------------------
  async expireSubscriptions(): Promise<number> {
    const result = await query<any>(
      `UPDATE subscriptions SET status = 'expired'
       WHERE status = 'active' AND expiry_time <= NOW()
       RETURNING id`,
    );
    const count = result.rows.length;
    if (count > 0) {
      logger.info(`Expired ${count} subscriptions`);
    }
    return count;
  },

  // ---- Get all subscriptions for a user --------------------------------
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    const result = await query<any>(
      `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(mapSubscription);
  },
};

export const isSubscriptionActive = subscriptionService.isSubscriptionActive.bind(subscriptionService);
export const activateSubscription = subscriptionService.activateSubscription.bind(subscriptionService);
export const getActiveSubscription = subscriptionService.getActiveSubscription.bind(subscriptionService);
export const getSubscriptionTimeRemaining = subscriptionService.getSubscriptionTimeRemaining.bind(subscriptionService);
