import {
  getRedis,
  setKey,
  getKey,
  deleteKey,
  getListRange,
  getListLength,
  pushToList,
  removeFromList,
  increment,
} from '../../utils/redis';
import { query } from '../../db';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { QueueEntry, MatchPreference, Gender } from '../../types';
import { preferenceService } from '../subscriptions/preferenceService';

const QUEUE_PREFIX = 'matchmaking';
const QUEUE_TTL = 60 * 5; // 5 minutes max in queue
const USER_QUEUE_KEY = 'user_queue_entry';

function queueKey(preference: MatchPreference) {
  return `${QUEUE_PREFIX}:${preference}`;
}

function userQueueKey(id: string) {
  return `${USER_QUEUE_KEY}:${id}`;
}

export const matchmakingService = {
  // ---- Join the matchmaking queue ----------------------------------------
  async joinQueue(
    id: string,
    type: 'user' | 'guest',
    preference: MatchPreference,
    gender: Gender | null,
    socketId: string,
    blockedList: string[],
    hasPreferencePass: boolean = false,
    starRating: number = 5.0,
    country: string = 'Global'
  ): Promise<QueueEntry> {
    // Remove any existing queue entry first
    await this.leaveQueue(id);

    // Anti-abuse: rate limit rapid joins
    const joinCount = await increment(`rl:queue-join:${id}`, 3600);
    if (joinCount > config.rateLimiting.maxMatchesPerHour) {
      throw Object.assign(new Error('Too many queue joins. Slow down.'), { statusCode: 429 });
    }

    const entry: QueueEntry = {
      id,
      type,
      preference,
      gender,
      country,
      socketId,
      joinedAt: Date.now(),
      blockedList,
      hasPreferencePass,
      starRating,
    };

    const serialized = JSON.stringify(entry);

    // Store entry lookup key
    await setKey(userQueueKey(id), serialized, QUEUE_TTL);

    // Add to the preference queue
    await pushToList(queueKey(preference), id);

    logger.debug('User joined queue', { id, preference, type, hasPreferencePass, starRating });
    return entry;
  },

  // ---- Leave the queue ---------------------------------------------------
  async leaveQueue(id: string): Promise<void> {
    const existing = await getKey(userQueueKey(id));
    if (existing) {
      const entry: QueueEntry = JSON.parse(existing);
      await removeFromList(queueKey(entry.preference), id);
      await deleteKey(userQueueKey(id));
      logger.debug('User left queue', { id });
    }
  },

  // ---- Get queue entry --------------------------------------------------
  async getQueueEntry(id: string): Promise<QueueEntry | null> {
    const raw = await getKey(userQueueKey(id));
    return raw ? JSON.parse(raw) : null;
  },

  // ---- Weighted Matchmaking Engine ---------------------------------------
  async findMatch(
    seekerId: string,
    preference: MatchPreference,
    seekerGender: Gender | null,
    blockedList: string[]
  ): Promise<QueueEntry | null> {
    // Determine queues to scan
    const queuesToSearch: string[] = [];
    if (preference === 'female') {
      queuesToSearch.push(queueKey('female'), queueKey('anyone'));
    } else if (preference === 'male') {
      queuesToSearch.push(queueKey('male'), queueKey('anyone'));
    } else {
      queuesToSearch.push(queueKey('anyone'), queueKey('female'), queueKey('male'));
    }

    const blockedSet = new Set(blockedList);
    const eligibleCandidates: Array<{ candidate: QueueEntry; score: number; queueKey: string }> = [];

    const now = Date.now();

    for (const qKey of queuesToSearch) {
      const candidates = await getListRange(qKey, 0, -1);

      for (const candidateId of candidates) {
        if (candidateId === seekerId) continue;
        if (blockedSet.has(candidateId)) continue;

        const entryRaw = await getKey(userQueueKey(candidateId));
        if (!entryRaw) {
          await removeFromList(qKey, candidateId);
          continue;
        }

        const candidateEntry: QueueEntry = JSON.parse(entryRaw);

        // Check if entry expired
        if (now - candidateEntry.joinedAt > QUEUE_TTL * 1000) {
          await this.leaveQueue(candidateId);
          continue;
        }

        // Mutual block check
        if (candidateEntry.blockedList.includes(seekerId)) continue;

        // Compatibility check
        if (!isCompatible(preference, candidateEntry)) continue;

        // ---- Calculate Weighted Matchmaking Score ----
        let score = 0;

        // 1. Preferred Gender Match bonus (+50 points)
        if (preference !== 'anyone' && candidateEntry.gender === preference) {
          score += 50;
        }

        // 2. Opposite Gender weight (+25 points)
        if (seekerGender && candidateEntry.gender && seekerGender !== candidateEntry.gender) {
          score += 25;
        }

        // 3. Wait-Time Priority Bonus (+1 point per 2 seconds waiting)
        const waitSeconds = Math.floor((now - candidateEntry.joinedAt) / 1000);
        score += Math.min(50, Math.floor(waitSeconds / 2));

        // 4. Star Rating weight (up to +15 points for high ratings)
        if (candidateEntry.starRating) {
          score += Math.round(candidateEntry.starRating * 3);
        }

        eligibleCandidates.push({ candidate: candidateEntry, score, queueKey: qKey });
      }
    }

    if (eligibleCandidates.length === 0) {
      return null;
    }

    // Sort by weighted matchmaking score descending
    eligibleCandidates.sort((a, b) => b.score - a.score);

    const chosen = eligibleCandidates[0].candidate;
    await this.leaveQueue(chosen.id);

    logger.info('Weighted match selected', {
      seekerId,
      matchedPeerId: chosen.id,
      score: eligibleCandidates[0].score,
    });

    return chosen;
  },

  // ---- Check if user is eligible for preference matching -----------------
  async isEligibleForPreferenceMatch(userId: string): Promise<boolean> {
    return preferenceService.isPreferenceActive(userId);
  },

  // ---- Backwards compatible alias ---------------------------------------
  async isEligibleForFemaleMatch(userId: string): Promise<boolean> {
    return this.isEligibleForPreferenceMatch(userId);
  },

  // ---- Get queue lengths ------------------------------------------------
  async getQueueStats(): Promise<Record<string, number>> {
    const [anyone, female, male] = await Promise.all([
      getListLength(queueKey('anyone')),
      getListLength(queueKey('female')),
      getListLength(queueKey('male')),
    ]);
    return { anyone, female, male, total: anyone + female + male };
  },
};

// -----------------------------------------------------------------------
// Helper: check compatibility
// -----------------------------------------------------------------------
function isCompatible(seekerPreference: MatchPreference, candidate: QueueEntry): boolean {
  if (seekerPreference === 'female') {
    return candidate.gender === 'female' || candidate.preference === 'female';
  }
  if (seekerPreference === 'male') {
    return candidate.gender === 'male' || candidate.preference === 'male';
  }
  return true;
}
