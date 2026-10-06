import { query } from '../../db';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { PreferencePass } from '../../types';

function mapPreferencePass(r: any): PreferencePass {
  return {
    id: r.id,
    userId: r.user_id,
    totalSecondsGranted: Number(r.total_seconds_granted) || 18000,
    remainingSeconds: Number(r.remaining_seconds) || 0,
    isActive: r.is_active === true,
    updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
  };
}

export const preferenceService = {
  // ---- Get or initialize user's preference pass bank --------------------
  async getPreferencePass(userId: string): Promise<PreferencePass | null> {
    const result = await query<any>(
      `SELECT * FROM preference_passes WHERE user_id = $1`,
      [userId]
    );
    if (!result.rows.length) return null;
    return mapPreferencePass(result.rows[0]);
  },

  // ---- Check if user has active preference pass with remaining time -----
  async isPreferenceActive(userId: string): Promise<boolean> {
    const pass = await this.getPreferencePass(userId);
    if (!pass) return false;
    return pass.isActive && pass.remainingSeconds > 0;
  },

  // ---- Grant preference pass ($2 for 5 hours = 18,000 banked seconds) ---
  async grantPreferencePass(userId: string, hours: number = 5): Promise<PreferencePass> {
    const secondsToAdd = hours * 3600;
    const existing = await this.getPreferencePass(userId);

    if (existing) {
      const newTotal = existing.totalSecondsGranted + secondsToAdd;
      const newRemaining = existing.remainingSeconds + secondsToAdd;
      const result = await query<any>(
        `UPDATE preference_passes
         SET total_seconds_granted = $1, remaining_seconds = $2, is_active = true, updated_at = NOW()
         WHERE user_id = $3
         RETURNING *`,
        [newTotal, newRemaining, userId]
      );
      logger.info('Topped up Preference Pass bank', { userId, hours, newRemaining });
      return mapPreferencePass(result.rows[0]);
    } else {
      const result = await query<any>(
        `INSERT INTO preference_passes (user_id, total_seconds_granted, remaining_seconds, is_active)
         VALUES ($1, $2, $2, true)
         RETURNING *`,
        [userId, secondsToAdd]
      );
      logger.info('Granted new Preference Pass bank', { userId, hours, seconds: secondsToAdd });
      return mapPreferencePass(result.rows[0]);
    }
  },

  // ---- Toggle Preference ON / OFF --------------------------------------
  async togglePreference(userId: string, isActive: boolean): Promise<PreferencePass> {
    const existing = await this.getPreferencePass(userId);
    if (!existing) {
      // Create empty pass if none exists
      const result = await query<any>(
        `INSERT INTO preference_passes (user_id, total_seconds_granted, remaining_seconds, is_active)
         VALUES ($1, 0, 0, $2)
         RETURNING *`,
        [userId, isActive]
      );
      return mapPreferencePass(result.rows[0]);
    }

    const result = await query<any>(
      `UPDATE preference_passes
       SET is_active = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [isActive, userId]
    );
    logger.info('Toggled preference state', { userId, isActive });
    return mapPreferencePass(result.rows[0]);
  },

  // ---- Time-Banking deduction: ONLY deducts during active preferred call --
  async deductBankedTime(userId: string, secondsUsed: number): Promise<PreferencePass | null> {
    if (secondsUsed <= 0) return null;
    const pass = await this.getPreferencePass(userId);
    if (!pass || pass.remainingSeconds <= 0) return null;

    const deducted = Math.min(pass.remainingSeconds, secondsUsed);
    const newRemaining = Math.max(0, pass.remainingSeconds - deducted);

    const result = await query<any>(
      `UPDATE preference_passes
       SET remaining_seconds = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [newRemaining, userId]
    );

    logger.info('Deducted banked preference time', { userId, deducted, newRemaining });
    return mapPreferencePass(result.rows[0]);
  },

  // ---- Get detailed status formatting for frontend ---------------------
  async getStatus(userId: string): Promise<{
    hasPass: boolean;
    isActive: boolean;
    remainingSeconds: number;
    formattedTime: string;
    totalSecondsGranted: number;
  }> {
    const pass = await this.getPreferencePass(userId);
    if (!pass || pass.remainingSeconds <= 0) {
      return {
        hasPass: false,
        isActive: pass ? pass.isActive : false,
        remainingSeconds: 0,
        formattedTime: '0h 0m',
        totalSecondsGranted: pass ? pass.totalSecondsGranted : 0,
      };
    }

    const hours = Math.floor(pass.remainingSeconds / 3600);
    const minutes = Math.floor((pass.remainingSeconds % 3600) / 60);

    return {
      hasPass: true,
      isActive: pass.isActive,
      remainingSeconds: pass.remainingSeconds,
      formattedTime: `${hours}h ${minutes}m`,
      totalSecondsGranted: pass.totalSecondsGranted,
    };
  },
};
