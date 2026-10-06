import { query } from '../../db';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { LoyaltyProgress, LoyaltyRewardClaim } from '../../types';

function mapLoyalty(r: any): LoyaltyProgress {
  return {
    id: r.id,
    userId: r.user_id,
    consecutiveDays: Number(r.consecutive_days) || 0,
    lastActiveDate: r.last_active_date || '',
    todayMinutes: Number(r.today_minutes) || 0,
    totalVerifiedMinutes: Number(r.total_verified_minutes) || 0,
    currentMilestoneTier: Number(r.current_milestone_tier) || 0,
    updatedAt: new Date(r.updated_at),
  };
}

export const loyaltyService = {
  // ---- Get or initialize loyalty progress -------------------------------
  async getProgress(userId: string): Promise<LoyaltyProgress> {
    const res = await query<any>(
      `SELECT * FROM loyalty_progress WHERE user_id = $1`,
      [userId]
    );

    if (res.rows.length) {
      return mapLoyalty(res.rows[0]);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const inserted = await query<any>(
      `INSERT INTO loyalty_progress (user_id, consecutive_days, last_active_date, today_minutes, total_verified_minutes, current_milestone_tier)
       VALUES ($1, 0, $2, 0, 0, 0)
       RETURNING *`,
      [userId, todayStr]
    );

    return mapLoyalty(inserted.rows[0]);
  },

  // ---- Record verified call minutes and update consecutive day streaks -
  async recordDailyMinutes(userId: string, minutes: number): Promise<LoyaltyProgress> {
    if (minutes <= 0) return this.getProgress(userId);

    const progress = await this.getProgress(userId);
    const todayStr = new Date().toISOString().split('T')[0];

    let newTodayMinutes = progress.todayMinutes;
    let newConsecutiveDays = progress.consecutiveDays;

    if (progress.lastActiveDate === todayStr) {
      newTodayMinutes += minutes;
    } else {
      // Check if yesterday was active
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (progress.lastActiveDate === yesterday && progress.todayMinutes >= 15) {
        newConsecutiveDays += 1;
      } else if (progress.lastActiveDate !== yesterday) {
        newConsecutiveDays = 1;
      }
      newTodayMinutes = minutes;
    }

    const newTotalMinutes = progress.totalVerifiedMinutes + minutes;

    // Check milestones
    const milestones = config.business.loyaltyMilestones;
    let currentTier = 0;
    for (let i = 0; i < milestones.length; i++) {
      if (newConsecutiveDays >= milestones[i].days) {
        currentTier = i + 1;
      }
    }

    const updated = await query<any>(
      `UPDATE loyalty_progress
       SET consecutive_days = $1, last_active_date = $2, today_minutes = $3,
           total_verified_minutes = $4, current_milestone_tier = $5, updated_at = NOW()
       WHERE user_id = $6
       RETURNING *`,
      [newConsecutiveDays, todayStr, newTodayMinutes, newTotalMinutes, currentTier, userId]
    );

    logger.info('Loyalty daily minutes recorded', { userId, minutes, newConsecutiveDays, currentTier });
    return mapLoyalty(updated.rows[0]);
  },

  // ---- Claim physical reward --------------------------------------------
  async claimReward(
    userId: string,
    milestoneDays: number,
    shippingName: string,
    shippingAddress: string,
    shippingCountry: string
  ): Promise<LoyaltyRewardClaim> {
    const progress = await this.getProgress(userId);
    if (progress.consecutiveDays < milestoneDays) {
      throw new Error(`You need ${milestoneDays} consecutive verified days to claim this reward.`);
    }

    const milestone = config.business.loyaltyMilestones.find((m) => m.days === milestoneDays);
    const rewardType = milestone ? milestone.rewardName : `Milestone ${milestoneDays} Days Reward`;

    const res = await query<any>(
      `INSERT INTO loyalty_rewards (user_id, milestone_days, reward_type, status, shipping_name, shipping_address, shipping_country)
       VALUES ($1, $2, $3, 'claimed', $4, $5, $6)
       RETURNING *`,
      [userId, milestoneDays, rewardType, shippingName, shippingAddress, shippingCountry]
    );

    const row = res.rows[0];
    logger.info('Loyalty reward claimed', { userId, milestoneDays, rewardType, shippingCountry });

    return {
      id: row.id,
      userId: row.user_id,
      milestoneDays: row.milestone_days,
      rewardType: row.reward_type,
      status: row.status,
      shippingName: row.shipping_name,
      shippingAddress: row.shipping_address,
      shippingCountry: row.shipping_country,
      claimedAt: new Date(row.claimed_at),
    };
  },

  // ---- Get all claimed rewards for user ---------------------------------
  async getUserRewards(userId: string): Promise<LoyaltyRewardClaim[]> {
    const res = await query<any>(
      `SELECT * FROM loyalty_rewards WHERE user_id = $1 ORDER BY claimed_at DESC`,
      [userId]
    );
    return res.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      milestoneDays: row.milestone_days,
      rewardType: row.reward_type,
      status: row.status,
      shippingName: row.shipping_name,
      shippingAddress: row.shipping_address,
      shippingCountry: row.shipping_country,
      trackingNumber: row.tracking_number,
      claimedAt: new Date(row.claimed_at),
    }));
  },
};
