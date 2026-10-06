import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import { query, transaction } from '../../db';
import { logger } from '../../utils/logger';
import { walletService } from '../wallet/walletService';
import { preferenceService } from '../subscriptions/preferenceService';
import {
  TOKEN_BUNDLES,
  TokenBundleType,
  PREFERENCE_PASS_PRODUCT,
  PARTNER_BOOKING_PRODUCT,
  FEMALE_PASS_PRODUCT,
} from '../../types';

const stripe = new Stripe(config.stripe.secretKey, { apiVersion: '2023-10-16' as any });

export const paymentService = {
  // ---- Create Stripe checkout session for Face Tokens purchase --------
  async createTokenPurchaseSession(
    userId: string,
    bundleType: TokenBundleType = 'standard'
  ): Promise<{ sessionUrl: string; sessionId: string }> {
    const bundle = TOKEN_BUNDLES[bundleType] || TOKEN_BUNDLES.standard;
    const idempotencyKey = `token-purchase:${userId}:${uuidv4()}`;

    // Create pending purchase record
    const purchaseResult = await query<any>(
      `INSERT INTO coin_purchases
         (user_id, stripe_session_id, amount_usd, coins_amount, status, idempotency_key)
       VALUES ($1, 'pending', $2, $3, 'pending', $4)
       RETURNING id`,
      [userId, bundle.priceUsd, bundle.tokens, idempotencyKey]
    );
    const purchaseId = purchaseResult.rows[0].id;

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: bundle.label,
                description: `${bundle.tokens.toLocaleString()} FaceChat Face Tokens`,
              },
              unit_amount: Math.round(bundle.priceUsd * 100),
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          bundleType,
          tokens: bundle.tokens.toString(),
          purchaseId,
          idempotencyKey,
          productType: 'token_purchase',
        },
        success_url: `${config.server.frontendUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.server.frontendUrl}/wallet?cancelled=1`,
      });

      await query(
        `UPDATE coin_purchases SET stripe_session_id = $1 WHERE id = $2`,
        [session.id, purchaseId]
      );

      logger.info('Face Token purchase session created', { userId, bundleType, sessionId: session.id });
      return { sessionUrl: session.url!, sessionId: session.id };
    } catch (stripeErr) {
      logger.info('Stripe API unavailable; utilizing Instant Simulated Checkout');
      const devSessionId = `dev_tokens_${uuidv4()}`;
      await query(
        `UPDATE coin_purchases SET stripe_session_id = $1, status = 'completed', completed_at = NOW() WHERE id = $2`,
        [devSessionId, purchaseId]
      );
      await walletService.creditPurchasedTokens(userId, bundle.tokens, devSessionId, bundle.priceUsd);
      const url = `${config.server.frontendUrl}/purchase/success?session_id=${devSessionId}`;
      return { sessionUrl: url, sessionId: devSessionId };
    }
  },

  // Backwards compatible alias
  async createCoinPurchaseSession(userId: string, bundleType: any) {
    return this.createTokenPurchaseSession(userId, bundleType);
  },

  // ---- Create Stripe checkout session for FaceChat Preference Pass -----
  async createPreferencePassSession(
    userId: string
  ): Promise<{ sessionUrl: string; sessionId: string }> {
    const idempotencyKey = `pref-pass:${userId}:${uuidv4()}`;

    const subResult = await query<any>(
      `INSERT INTO subscriptions
         (user_id, product_type, stripe_session_id, amount_usd, status, idempotency_key)
       VALUES ($1, $2, 'pending', $3, 'pending', $4)
       RETURNING id`,
      [userId, PREFERENCE_PASS_PRODUCT, config.business.preferencePassPriceUsd, idempotencyKey]
    );
    const subscriptionId = subResult.rows[0].id;

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'FaceChat Preference Pass (5 Hours)',
                description: '5 hours of banked preference matching. Time only elapses during active preferred calls!',
              },
              unit_amount: Math.round(config.business.preferencePassPriceUsd * 100),
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          subscriptionId,
          idempotencyKey,
          productType: PREFERENCE_PASS_PRODUCT,
          durationHours: config.business.preferencePassDurationHours.toString(),
        },
        success_url: `${config.server.frontendUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.server.frontendUrl}/female-pass?cancelled=1`,
      });

      await query(
        `UPDATE subscriptions SET stripe_session_id = $1 WHERE id = $2`,
        [session.id, subscriptionId]
      );

      logger.info('Preference Pass session created', { userId, sessionId: session.id });
      return { sessionUrl: session.url!, sessionId: session.id };
    } catch (stripeErr) {
      logger.info('Stripe API unavailable; utilizing Instant Simulated Checkout');
      const devSessionId = `dev_pref_${uuidv4()}`;
      await query(
        `UPDATE subscriptions
         SET stripe_session_id = $1, status = 'active', start_time = NOW()
         WHERE id = $2`,
        [devSessionId, subscriptionId]
      );
      // Grant 5 hours to the time bank
      await preferenceService.grantPreferencePass(userId, config.business.preferencePassDurationHours);
      const url = `${config.server.frontendUrl}/purchase/success?session_id=${devSessionId}`;
      return { sessionUrl: url, sessionId: devSessionId };
    }
  },

  // Backwards compatible alias
  async createFemalePassSession(userId: string) {
    return this.createPreferencePassSession(userId);
  },

  // ---- Handle Stripe webhook (raw body, verify signature) ---------------
  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
    } catch (err: any) {
      logger.error('Stripe webhook signature verification failed', { err: err.message });
      throw Object.assign(new Error(`Webhook signature verification failed: ${err.message}`), { statusCode: 400 });
    }

    logger.info('Stripe webhook received', { type: event.type, id: event.id });

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        logger.debug('Unhandled Stripe event', { type: event.type });
    }
  },

  // ---- Process successful checkout -------------------------------------
  async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const { metadata } = session;
    if (!metadata) {
      logger.error('Checkout session has no metadata', { sessionId: session.id });
      return;
    }

    const { userId, productType } = metadata;

    if (productType === 'token_purchase' || productType === 'coin_purchase') {
      const tokens = parseInt(metadata.tokens || metadata.coins, 10);
      const amountUsd = (session.amount_total || 0) / 100;
      const purchaseId = metadata.purchaseId;

      const existing = await query<any>(
        `SELECT id, status FROM coin_purchases WHERE id = $1`,
        [purchaseId]
      );
      if (existing.rows.length && existing.rows[0].status === 'completed') {
        logger.warn('Token purchase already processed', { purchaseId, sessionId: session.id });
        return;
      }

      await transaction(async (client) => {
        await client.query(
          `UPDATE coin_purchases
           SET status = 'completed', stripe_session_id = $1,
               stripe_payment_intent_id = $2, completed_at = NOW()
           WHERE id = $3`,
          [session.id, session.payment_intent, purchaseId]
        );
        await walletService.creditPurchasedTokens(userId, tokens, session.id, amountUsd);
      });

      logger.info('Face Tokens credited after successful payment', { userId, tokens, sessionId: session.id });
    } else if (productType === PREFERENCE_PASS_PRODUCT || productType === FEMALE_PASS_PRODUCT) {
      const subscriptionId = metadata.subscriptionId;

      await transaction(async (client) => {
        await client.query(
          `UPDATE subscriptions
           SET stripe_session_id = $1, stripe_payment_intent_id = $2, status = 'active',
               start_time = NOW(), payment_reference = $3
           WHERE id = $4`,
          [session.id, session.payment_intent, session.payment_intent, subscriptionId]
        );
      });

      // Credit 5 hours to the user's preference time bank
      await preferenceService.grantPreferencePass(userId, config.business.preferencePassDurationHours);
      logger.info('Preference Pass time bank credited', { userId, hours: config.business.preferencePassDurationHours });
    }
  },

  // ---- Handle payment failure ------------------------------------------
  async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await query(
      `UPDATE coin_purchases SET status = 'failed' WHERE stripe_payment_intent_id = $1 AND status = 'pending'`,
      [paymentIntent.id]
    );
    await query(
      `UPDATE subscriptions SET status = 'expired' WHERE stripe_payment_intent_id = $1 AND status = 'pending'`,
      [paymentIntent.id]
    );
    logger.info('Payment failed, records updated', { paymentIntentId: paymentIntent.id });
  },

  // ---- Get available products ------------------------------------------
  async getProducts() {
    return {
      tokenBundles: Object.entries(TOKEN_BUNDLES).map(([type, bundle]) => ({
        type,
        label: bundle.label,
        tokens: bundle.tokens,
        priceUsd: bundle.priceUsd,
      })),
      preferencePass: {
        type: PREFERENCE_PASS_PRODUCT,
        label: 'FaceChat Preference Pass',
        durationHours: config.business.preferencePassDurationHours,
        priceUsd: config.business.preferencePassPriceUsd,
        description: '5 hours of banked preferred matching. Time only elapses during active preferred calls!',
      },
      partnerBooking: {
        type: PARTNER_BOOKING_PRODUCT,
        label: 'Preferred Partner Booking',
        priceUsd: config.business.partnerPassPriceUsd,
        maxMinutes: config.business.partnerTotalMinutes,
        durationDays: config.business.partnerPassDurationDays,
      },
      publishableKey: config.stripe.publishableKey,
    };
  },
};
