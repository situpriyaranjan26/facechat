import { query } from '../../db';
import { logger } from '../../utils/logger';
import { User, UserStats, MatchmakingPreference, UserPublicProfile } from '../../types';
import { mapUserRow } from '../../middleware/auth';

export const userService = {
  // ---- Get public profile -----------------------------------------------
  async getProfile(userId: string): Promise<UserPublicProfile> {
    const result = await query<any>(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (!result.rows.length) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }
    const u = mapUserRow(result.rows[0]);
    return {
      id: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      country: u.country,
      languages: u.languages,
      interests: u.interests,
      gender: u.gender,
      createdAt: u.createdAt,
    };
  },

  // ---- Get full user (for self) ----------------------------------------
  async getFullUser(userId: string): Promise<User> {
    const result = await query<any>(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (!result.rows.length) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }
    return mapUserRow(result.rows[0]);
  },

  // ---- Update profile --------------------------------------------------
  async updateProfile(
    userId: string,
    updates: {
      displayName?: string;
      avatarUrl?: string | null;
      country?: string;
      languages?: string[];
      interests?: string[];
      gender?: string;
    }
  ): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.displayName !== undefined) {
      fields.push(`display_name = $${idx++}`);
      values.push(updates.displayName);
    }
    if (updates.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(updates.avatarUrl);
    }
    if (updates.country !== undefined) {
      fields.push(`country = $${idx++}`);
      values.push(updates.country);
    }
    if (updates.languages !== undefined) {
      fields.push(`languages = $${idx++}`);
      values.push(updates.languages);
    }
    if (updates.interests !== undefined) {
      fields.push(`interests = $${idx++}`);
      values.push(updates.interests);
    }
    if (updates.gender !== undefined) {
      fields.push(`gender = $${idx++}`);
      values.push(updates.gender);
    }

    if (!fields.length) {
      throw Object.assign(new Error('No fields to update'), { statusCode: 400 });
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await query<any>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (!result.rows.length) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    logger.info('Profile updated', { userId });
    return mapUserRow(result.rows[0]);
  },

  // ---- Get stats -------------------------------------------------------
  async getStats(userId: string): Promise<UserStats> {
    const result = await query<any>(
      `SELECT * FROM user_stats WHERE user_id = $1`,
      [userId]
    );
    if (!result.rows.length) {
      // Create stats row if missing
      await query(`INSERT INTO user_stats (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
      const fresh = await query<any>(`SELECT * FROM user_stats WHERE user_id = $1`, [userId]);
      return mapStats(fresh.rows[0]);
    }
    return mapStats(result.rows[0]);
  },

  // ---- Get achievements ------------------------------------------------
  async getAchievements(userId: string) {
    const result = await query<any>(
      `SELECT * FROM achievements WHERE user_id = $1 ORDER BY achieved_at DESC`,
      [userId]
    );
    return result.rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      achievementType: r.achievement_type,
      achievedAt: r.achieved_at,
      metadata: r.metadata,
    }));
  },

  // ---- Get matchmaking preferences -------------------------------------
  async getPreferences(userId: string): Promise<MatchmakingPreference> {
    const result = await query<any>(
      `SELECT * FROM matchmaking_preferences WHERE user_id = $1`,
      [userId]
    );
    if (!result.rows.length) {
      await query(
        `INSERT INTO matchmaking_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      const fresh = await query<any>(`SELECT * FROM matchmaking_preferences WHERE user_id = $1`, [userId]);
      return mapPrefs(fresh.rows[0]);
    }
    return mapPrefs(result.rows[0]);
  },

  // ---- Update matchmaking preferences ----------------------------------
  async updatePreferences(userId: string, preference: string): Promise<MatchmakingPreference> {
    const result = await query<any>(
      `INSERT INTO matchmaking_preferences (user_id, preference)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET preference = EXCLUDED.preference, updated_at = NOW()
       RETURNING *`,
      [userId, preference]
    );
    logger.info('Preferences updated', { userId, preference });
    return mapPrefs(result.rows[0]);
  },

  // ---- List users (admin) ----------------------------------------------
  async listUsers(filters: { search?: string; isBanned?: boolean; page: number; limit: number }) {
    const { search, isBanned, page, limit } = filters;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (search) {
      conditions.push(`(email ILIKE $${idx} OR display_name ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }
    if (isBanned !== undefined) {
      conditions.push(`is_banned = $${idx++}`);
      values.push(isBanned);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await query<any>(`SELECT COUNT(*) FROM users ${where}`, values);
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(limit, offset);
    const dataResult = await query<any>(
      `SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );

    return { users: dataResult.rows.map(mapUserRow), total, page, limit };
  },
};

function mapStats(r: any): UserStats {
  return {
    id: r.id,
    userId: r.user_id,
    totalConversations: Number(r.total_conversations) || 0,
    totalConversationMinutes: Number(r.total_conversation_minutes) || 0,
    verifiedSeconds: Number(r.verified_seconds) || 0,
    countriesEncountered: r.countries_encountered || [],
    peoplemetToday: Number(r.people_met_today) || 0,
    conversationStreak: Number(r.conversation_streak) || 0,
    loginStreak: Number(r.login_streak) || 0,
    starRating: Number(r.star_rating) || 5.0,
    updatedAt: r.updated_at,
  };
}

function mapPrefs(r: any): MatchmakingPreference {
  return {
    id: r.id,
    userId: r.user_id,
    preference: r.preference,
    updatedAt: r.updated_at,
  };
}
