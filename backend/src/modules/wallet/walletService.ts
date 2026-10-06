import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../../db';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { Wallet, WalletTransaction, TransactionType } from '../../types';

// -----------------------------------------------------------------------
// Row mappers
// -----------------------------------------------------------------------
function mapWallet(r: any): Wallet {
  return {
    id: r.id,
    userId: r.user_id,
    balance: Number(r.balance) || 0,
    totalEarned: Number(r.total_earned) || 0,
    totalSpent: Number(r.total_spent) || 0,
    totalPurchased: Number(r.total_purchased) || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapTransaction(r: any): WalletTransaction {
  return {
    id: r.id,
    userId: r.user_id,
    amount: Number(r.amount) || 0,
    transactionType: r.transaction_type,
    balanceAfter: Number(r.balance_after) || 0,
    conversationId: r.conversation_id,
    referenceId: r.reference_id,
    description: r.description,
    metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {}),
    idempotencyKey: r.idempotency_key,
    createdAt: r.created_at,
  };
}

// -----------------------------------------------------------------------
// Wallet & Face Tokens Ledger Service
// -----------------------------------------------------------------------
export const walletService = {
  // ---- Create wallet (with INITIAL_FACE_TOKENS = 10) -------------------
  async createWallet(userId: string): Promise<Wallet> {
    const initialTokens = config.business.initialFaceTokens || 10;
    const result = await query<any>(
      `INSERT INTO wallets (user_id, balance, total_earned)
       VALUES ($1, $2, $2)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING *`,
      [userId, initialTokens]
    );

    if (result.rows.length) {
      // Record initial Face Tokens grant
      const idempotencyKey = `initial-grant:${userId}`;
      await query(
        `INSERT INTO wallet_transactions
           (user_id, amount, transaction_type, balance_after, description, idempotency_key)
         VALUES ($1, $2, 'BONUS', $2, 'Initial Face Tokens Welcome Grant', $3)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [userId, initialTokens, idempotencyKey]
      );
      logger.info('Wallet created with initial Face Tokens', { userId, initialTokens });
      return mapWallet(result.rows[0]);
    }

    // Wallet already existed – return it
    return this.getWallet(userId);
  },

  // ---- Get wallet -------------------------------------------------------
  async getWallet(userId: string): Promise<Wallet> {
    const result = await query<any>(
      `SELECT * FROM wallets WHERE user_id = $1`,
      [userId]
    );
    if (!result.rows.length) {
      // Auto-create wallet if not exists
      return this.createWallet(userId);
    }
    return mapWallet(result.rows[0]);
  },

  // ---- Check balance ----------------------------------------------------
  async checkBalance(userId: string): Promise<number> {
    const result = await query<any>(
      `SELECT balance FROM wallets WHERE user_id = $1`,
      [userId]
    );
    if (!result.rows.length) {
      const created = await this.createWallet(userId);
      return created.balance;
    }
    return Number(result.rows[0].balance) || 0;
  },

  // ---- Add transaction (atomic ledger) ---------------------------------
  async addTransaction(
    userId: string,
    amount: number,
    type: TransactionType,
    description: string,
    idempotencyKey: string,
    metadata: Record<string, any> = {},
    conversationId?: string,
    referenceId?: string
  ): Promise<WalletTransaction> {
    return transaction(async (client) => {
      // Check idempotency – return existing record if present
      const existing = await client.query(
        `SELECT * FROM wallet_transactions WHERE idempotency_key = $1`,
        [idempotencyKey]
      );
      if (existing.rows.length) {
        logger.warn('Duplicate transaction prevented by idempotency', { idempotencyKey });
        return mapTransaction(existing.rows[0]);
      }

      // Lock wallet row
      let walletResult = await client.query(
        `SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );
      if (!walletResult.rows.length) {
        // Create initial wallet
        await client.query(
          `INSERT INTO wallets (user_id, balance, total_earned) VALUES ($1, $2, $2)`,
          [userId, config.business.initialFaceTokens]
        );
        walletResult = await client.query(
          `SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
          [userId]
        );
      }

      const currentBalance: number = Number(walletResult.rows[0].balance) || 0;
      const newBalance = currentBalance + amount;

      if (newBalance < 0) {
        throw Object.assign(new Error('Insufficient Face Tokens balance'), {
          statusCode: 400,
          code: 'INSUFFICIENT_BALANCE',
        });
      }

      // Update wallet balance and aggregate totals
      if (type === 'CONVERSATION_REWARD' || type === 'EARN' || type === 'BONUS') {
        await client.query(
          `UPDATE wallets SET balance = $1, total_earned = total_earned + $2, updated_at = NOW() WHERE user_id = $3`,
          [newBalance, Math.max(0, amount), userId]
        );
      } else if (type === 'CONVERSATION_SPEND' || type === 'SPEND' || type === 'SKIP_PENALTY') {
        await client.query(
          `UPDATE wallets SET balance = $1, total_spent = total_spent + $2, updated_at = NOW() WHERE user_id = $3`,
          [newBalance, Math.abs(amount), userId]
        );
      } else if (type === 'PURCHASE') {
        await client.query(
          `UPDATE wallets SET balance = $1, total_purchased = total_purchased + $2, updated_at = NOW() WHERE user_id = $3`,
          [newBalance, amount, userId]
        );
      } else {
        await client.query(
          `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2`,
          [newBalance, userId]
        );
      }

      // Insert into audit ledger
      const txResult = await client.query(
        `INSERT INTO wallet_transactions
           (user_id, amount, transaction_type, balance_after, conversation_id, reference_id,
            description, metadata, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          userId,
          amount,
          type,
          newBalance,
          conversationId || null,
          referenceId || null,
          description,
          JSON.stringify(metadata),
          idempotencyKey,
        ]
      );

      logger.info('Face Token transaction recorded', {
        userId,
        amount,
        type,
        newBalance,
        idempotencyKey,
      });

      return mapTransaction(txResult.rows[0]);
    });
  },

  // ---- Conversation Reward (+5 at > 2 min, +5 per extra completed minute) --
  async processConversationReward(
    userId: string,
    conversationId: string,
    durationSeconds: number
  ): Promise<WalletTransaction | null> {
    const minSeconds = config.business.minimumRewardDurationSeconds || 120;
    if (durationSeconds <= minSeconds) {
      return null;
    }

    const baseReward = config.business.baseConversationReward || 5;
    const additionalMinuteReward = config.business.additionalMinuteReward || 5;

    const extraSeconds = durationSeconds - minSeconds;
    const extraCompletedMinutes = Math.floor(extraSeconds / 60);
    const totalReward = baseReward + extraCompletedMinutes * additionalMinuteReward;

    const idempotencyKey = `reward:${conversationId}:${userId}`;
    return this.addTransaction(
      userId,
      totalReward,
      'CONVERSATION_REWARD',
      `Earned ${totalReward} Face Tokens for ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s conversation`,
      idempotencyKey,
      { conversationId, durationSeconds, baseReward, extraCompletedMinutes, totalReward },
      conversationId
    );
  },

  // ---- Base Conversation Spend (1 token per minute) ---------------------
  async processConversationSpend(
    userId: string,
    conversationId: string,
    durationSeconds: number
  ): Promise<WalletTransaction | null> {
    const minutes = Math.floor(durationSeconds / 60);
    if (minutes < 1) return null;

    const rate = config.business.tokensSpentPerMinute || 1;
    const spentTokens = minutes * rate;
    const idempotencyKey = `spend:${conversationId}:${userId}`;

    // Gracefully handle partial balance without throwing unhandled rejection
    const currentBalance = await this.checkBalance(userId);
    const actualSpend = Math.min(currentBalance, spentTokens);
    if (actualSpend <= 0) return null;

    return this.addTransaction(
      userId,
      -actualSpend,
      'CONVERSATION_SPEND',
      `Used ${actualSpend} Face Tokens for ${minutes} min conversation`,
      idempotencyKey,
      { conversationId, durationSeconds, minutes, requestedSpend: spentTokens, actualSpend },
      conversationId
    );
  },

  // ---- Instant Skip Penalty (-2 Face Tokens if < 2 min and user skipped) -
  async applySkipPenalty(
    userId: string,
    conversationId: string,
    durationSeconds: number
  ): Promise<WalletTransaction | null> {
    const threshold = config.business.instantSkipThresholdSeconds || 120;
    if (durationSeconds >= threshold) return null;

    const penaltyAmount = config.business.instantSkipPenalty || 2;
    const currentBalance = await this.checkBalance(userId);
    if (currentBalance <= 0) return null; // Balance cannot drop below 0

    const actualPenalty = Math.min(currentBalance, penaltyAmount);
    const idempotencyKey = `skip-penalty:${conversationId}:${userId}`;

    return this.addTransaction(
      userId,
      -actualPenalty,
      'SKIP_PENALTY',
      `Instant skip penalty (-${actualPenalty} Face Tokens for skipping under 2 minutes)`,
      idempotencyKey,
      { conversationId, durationSeconds, threshold, penaltyAmount, actualPenalty },
      conversationId
    );
  },

  // ---- Backwards-compatible alias methods -------------------------------
  async earnCoins(userId: string, conversationId: string, durationSeconds: number): Promise<WalletTransaction | null> {
    return this.processConversationReward(userId, conversationId, durationSeconds);
  },

  async spendCoins(userId: string, conversationId: string, durationSeconds: number): Promise<WalletTransaction | null> {
    return this.processConversationSpend(userId, conversationId, durationSeconds);
  },

  // ---- Get transaction history ------------------------------------------
  async getTransactionHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ transactions: WalletTransaction[]; total: number }> {
    const countResult = await query<any>(
      `SELECT COUNT(*) FROM wallet_transactions WHERE user_id = $1`,
      [userId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query<any>(
      `SELECT * FROM wallet_transactions WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return { transactions: result.rows.map(mapTransaction), total };
  },

  // ---- Credit purchased tokens from Stripe ($4 for 1,000 Face Tokens) ---
  async creditPurchasedTokens(
    userId: string,
    tokens: number,
    stripeSessionId: string,
    amountUsd: number
  ): Promise<WalletTransaction> {
    const idempotencyKey = `purchase:${stripeSessionId}`;
    return this.addTransaction(
      userId,
      tokens,
      'PURCHASE',
      `Purchased ${tokens.toLocaleString()} Face Tokens for $${amountUsd.toFixed(2)}`,
      idempotencyKey,
      { stripeSessionId, amountUsd, tokens },
      undefined,
      stripeSessionId
    );
  },

  async creditPurchasedCoins(
    userId: string,
    coins: number,
    stripeSessionId: string,
    amountUsd: number
  ): Promise<WalletTransaction> {
    return this.creditPurchasedTokens(userId, coins, stripeSessionId, amountUsd);
  },
};

export const getBalance = walletService.checkBalance.bind(walletService);
export const getWallet = walletService.getWallet.bind(walletService);
export const addTransaction = walletService.addTransaction.bind(walletService);
export const earnCoins = walletService.earnCoins.bind(walletService);
export const spendCoins = walletService.spendCoins.bind(walletService);
export const createWallet = walletService.createWallet.bind(walletService);
export const getTransactionHistory = walletService.getTransactionHistory.bind(walletService);
export const creditPurchasedTokens = walletService.creditPurchasedTokens.bind(walletService);
export const creditPurchasedCoins = walletService.creditPurchasedCoins.bind(walletService);
export const creditPurchase = walletService.creditPurchasedCoins.bind(walletService);
