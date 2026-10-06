import { query, transaction } from '../../db';
import { config } from '../../config';
import { logger, logEvent } from '../../utils/logger';
import { Conversation, MatchPreference } from '../../types';
import { walletService } from '../wallet/walletService';
import { preferenceService } from '../subscriptions/preferenceService';
import { creatorService } from '../creators/creatorService';
import { loyaltyService } from '../loyalty/loyaltyService';
import { v4 as uuidv4 } from 'uuid';

function mapToConversation(row: any): Conversation {
  return {
    id: row.id,
    userAId: row.user_a_id,
    userBId: row.user_b_id,
    guestASessionId: row.guest_a_session_id,
    guestBSessionId: row.guest_b_session_id,
    status: row.status,
    startedAt: row.started_at ? new Date(row.started_at) : null,
    endedAt: row.ended_at ? new Date(row.ended_at) : null,
    durationSeconds: Number(row.duration_seconds) || 0,
    endedBy: row.ended_by,
    endReason: row.end_reason,
    coinsEarnedA: Number(row.coins_earned_a) || 0,
    coinsEarnedB: Number(row.coins_earned_b) || 0,
    coinsSpentA: Number(row.coins_spent_a) || 0,
    coinsSpentB: Number(row.coins_spent_b) || 0,
    matchPreference: row.match_preference || 'anyone',
    qualityScore: row.quality_score,
    createdAt: new Date(row.created_at),
  };
}

export async function createConversation(
  userAId: string | null,
  userBId: string | null,
  guestAId: string | null,
  guestBId: string | null,
  matchPreference: MatchPreference = 'anyone'
): Promise<Conversation> {
  const id = uuidv4();
  const { rows } = await query(
    `INSERT INTO conversations 
     (id, user_a_id, user_b_id, guest_a_session_id, guest_b_session_id, match_preference, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'connecting')
     RETURNING *`,
    [id, userAId, userBId, guestAId, guestBId, matchPreference]
  );
  logEvent('conversation_created', { conversationId: id, userAId, userBId, guestAId, guestBId, matchPreference });
  return mapToConversation(rows[0]);
}

export async function startConversation(conversationId: string): Promise<Conversation | null> {
  const { rows } = await query(
    `UPDATE conversations 
     SET status = 'active', started_at = NOW() 
     WHERE id = $1 AND status != 'ended'
     RETURNING *`,
    [conversationId]
  );
  if (rows[0]) {
    logEvent('conversation_started', { conversationId });
    return mapToConversation(rows[0]);
  }
  return null;
}

export async function endConversation(
  conversationId: string,
  endedBy: string,
  endReason: string = 'user_ended'
): Promise<Conversation | null> {
  const { rows: currentRows } = await query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
  if (!currentRows[0] || currentRows[0].status === 'ended') {
    return currentRows[0] ? mapToConversation(currentRows[0]) : null;
  }

  const conv = currentRows[0];
  const startedAt = conv.started_at ? new Date(conv.started_at).getTime() : Date.now();
  const endedAtTime = Date.now();
  const durationSeconds = Math.max(0, Math.floor((endedAtTime - startedAt) / 1000));
  const durationMinutes = Math.floor(durationSeconds / 60);

  // Accounting for User A and User B
  let tokensEarnedA = 0;
  let tokensSpentA = 0;
  let tokensEarnedB = 0;
  let tokensSpentB = 0;

  const isUserInitiatedSkip = endReason === 'user_skipped' || endReason === 'user_ended';

  // Process User A
  if (conv.user_a_id) {
    try {
      if (durationSeconds >= config.business.minimumRewardDurationSeconds) {
        // Earning (+5 at > 120s, +5 each extra minute)
        const earnRes = await walletService.processConversationReward(conv.user_a_id, conversationId, durationSeconds);
        tokensEarnedA = earnRes ? earnRes.amount : 0;
      } else if (isUserInitiatedSkip && endedBy === conv.user_a_id) {
        // Skip penalty (-2 Face Tokens)
        await walletService.applySkipPenalty(conv.user_a_id, conversationId, durationSeconds);
      }

      // Base spend: 1 Face Token per minute
      if (durationMinutes >= 1) {
        const spendRes = await walletService.processConversationSpend(conv.user_a_id, conversationId, durationSeconds);
        tokensSpentA = spendRes ? Math.abs(spendRes.amount) : 0;
      }

      // Preference Time-Banking: only deducts if user had preference pass and matched preference
      if (conv.match_preference !== 'anyone') {
        await preferenceService.deductBankedTime(conv.user_a_id, durationSeconds);
      }

      // Creator earnings ($1/hr on eligible preference calls)
      if (conv.match_preference !== 'anyone') {
        await creatorService.accrueCallEarnings(conv.user_a_id, durationSeconds);
      }

      // Loyalty daily minutes tracking
      await loyaltyService.recordDailyMinutes(conv.user_a_id, Math.max(1, durationMinutes));
    } catch (e) {
      logger.error('Error accounting for user A', e);
    }
  }

  // Process User B
  if (conv.user_b_id) {
    try {
      if (durationSeconds >= config.business.minimumRewardDurationSeconds) {
        const earnRes = await walletService.processConversationReward(conv.user_b_id, conversationId, durationSeconds);
        tokensEarnedB = earnRes ? earnRes.amount : 0;
      } else if (isUserInitiatedSkip && endedBy === conv.user_b_id) {
        await walletService.applySkipPenalty(conv.user_b_id, conversationId, durationSeconds);
      }

      if (durationMinutes >= 1) {
        const spendRes = await walletService.processConversationSpend(conv.user_b_id, conversationId, durationSeconds);
        tokensSpentB = spendRes ? Math.abs(spendRes.amount) : 0;
      }

      if (conv.match_preference !== 'anyone') {
        await preferenceService.deductBankedTime(conv.user_b_id, durationSeconds);
        await creatorService.accrueCallEarnings(conv.user_b_id, durationSeconds);
      }

      await loyaltyService.recordDailyMinutes(conv.user_b_id, Math.max(1, durationMinutes));
    } catch (e) {
      logger.error('Error accounting for user B', e);
    }
  }

  const { rows } = await query(
    `UPDATE conversations 
     SET status = 'ended', 
         ended_at = NOW(), 
         duration_seconds = $1, 
         ended_by = $2, 
         end_reason = $3,
         coins_earned_a = $4,
         coins_spent_a = $5,
         coins_earned_b = $6,
         coins_spent_b = $7
     WHERE id = $8
     RETURNING *`,
    [durationSeconds, endedBy, endReason, tokensEarnedA, tokensSpentA, tokensEarnedB, tokensSpentB, conversationId]
  );

  // Update cumulative user stats
  if (conv.user_a_id) {
    await query(
      `INSERT INTO user_stats (user_id, total_conversations, total_conversation_minutes, verified_seconds, people_met_today)
       VALUES ($1, 1, $2, $3, 1)
       ON CONFLICT (user_id) DO UPDATE 
       SET total_conversations = user_stats.total_conversations + 1,
           total_conversation_minutes = user_stats.total_conversation_minutes + $2,
           verified_seconds = user_stats.verified_seconds + $3,
           people_met_today = user_stats.people_met_today + 1,
           updated_at = NOW()`,
      [conv.user_a_id, Math.ceil(durationSeconds / 60), durationSeconds]
    );
  }
  if (conv.user_b_id) {
    await query(
      `INSERT INTO user_stats (user_id, total_conversations, total_conversation_minutes, verified_seconds, people_met_today)
       VALUES ($1, 1, $2, $3, 1)
       ON CONFLICT (user_id) DO UPDATE 
       SET total_conversations = user_stats.total_conversations + 1,
           total_conversation_minutes = user_stats.total_conversation_minutes + $2,
           verified_seconds = user_stats.verified_seconds + $3,
           people_met_today = user_stats.people_met_today + 1,
           updated_at = NOW()`,
      [conv.user_b_id, Math.ceil(durationSeconds / 60), durationSeconds]
    );
  }

  logEvent('conversation_ended', { conversationId, durationSeconds, endedBy, endReason, tokensEarnedA, tokensEarnedB });
  return rows[0] ? mapToConversation(rows[0]) : null;
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const { rows } = await query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
  return rows[0] ? mapToConversation(rows[0]) : null;
}
