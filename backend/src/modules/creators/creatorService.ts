import { query } from '../../db';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { CreatorProfile, CreatorStatus } from '../../types';

function mapCreator(r: any): CreatorProfile {
  return {
    id: r.id,
    userId: r.user_id,
    status: r.status as CreatorStatus,
    verifiedHours: Number(r.verified_hours) || 0,
    eligiblePreferenceHours: Number(r.eligible_preference_hours) || 0,
    pendingPayoutUsd: Number(r.pending_payout_usd) || 0,
    paidOutUsd: Number(r.paid_out_usd) || 0,
    kycStatus: r.kyc_status || 'unsubmitted',
    payoutMethod: r.payout_method,
    payoutDetails: r.payout_details,
    appliedAt: new Date(r.applied_at || r.created_at),
    approvedAt: r.approved_at ? new Date(r.approved_at) : undefined,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export const creatorService = {
  // ---- Get or create creator profile -----------------------------------
  async getProfile(userId: string): Promise<CreatorProfile> {
    const res = await query<any>(
      `SELECT * FROM creator_profiles WHERE user_id = $1`,
      [userId]
    );

    if (res.rows.length) {
      return mapCreator(res.rows[0]);
    }

    // Check user's verified hours from user_stats
    const statsRes = await query<any>(
      `SELECT total_conversation_minutes FROM user_stats WHERE user_id = $1`,
      [userId]
    );
    const totalMinutes = Number(statsRes.rows[0]?.total_conversation_minutes || 0);
    const verifiedHours = Number((totalMinutes / 60).toFixed(2));

    const insert = await query<any>(
      `INSERT INTO creator_profiles (user_id, status, verified_hours)
       VALUES ($1, 'none', $2)
       RETURNING *`,
      [userId, verifiedHours]
    );

    return mapCreator(insert.rows[0]);
  },

  // ---- Apply for Creator status (requires 750 verified hours) ----------
  async applyForCreator(
    userId: string,
    payoutMethod: string,
    payoutDetails: string
  ): Promise<{ profile: CreatorProfile; isEligible: boolean; message: string }> {
    const profile = await this.getProfile(userId);

    // Refresh verified hours
    const statsRes = await query<any>(
      `SELECT total_conversation_minutes FROM user_stats WHERE user_id = $1`,
      [userId]
    );
    const totalMinutes = Number(statsRes.rows[0]?.total_conversation_minutes || 0);
    const verifiedHours = Number((totalMinutes / 60).toFixed(2));
    const minHours = config.business.activeMemberMinHours || 750;

    const isEligible = verifiedHours >= minHours;
    const newStatus: CreatorStatus = isEligible ? 'pending' : 'none';

    const updated = await query<any>(
      `UPDATE creator_profiles
       SET status = $1, verified_hours = $2, payout_method = $3, payout_details = $4,
           kyc_status = 'pending', applied_at = NOW(), updated_at = NOW()
       WHERE user_id = $5
       RETURNING *`,
      [newStatus, verifiedHours, payoutMethod, payoutDetails, userId]
    );

    const message = isEligible
      ? 'Your Creator application has been submitted for verification.'
      : `You need ${minHours} verified conversation hours to apply. Current: ${verifiedHours} hours.`;

    logger.info('Creator application processed', { userId, verifiedHours, isEligible, newStatus });

    return {
      profile: mapCreator(updated.rows[0]),
      isEligible,
      message,
    };
  },

  // ---- Accrue creator earnings for eligible preferred calls ($1/hour) ---
  async accrueCallEarnings(
    creatorUserId: string,
    callDurationSeconds: number
  ): Promise<{ earnedUsd: number; newPendingPayout: number } | null> {
    const profile = await this.getProfile(creatorUserId);
    if (profile.status !== 'approved') return null;

    const hours = callDurationSeconds / 3600;
    const ratePerHour = config.business.creatorRateUsdPerHour || 1.0;
    const earnedUsd = Number((hours * ratePerHour).toFixed(4));

    if (earnedUsd <= 0) return null;

    const res = await query<any>(
      `UPDATE creator_profiles
       SET eligible_preference_hours = eligible_preference_hours + $1,
           pending_payout_usd = pending_payout_usd + $2,
           updated_at = NOW()
       WHERE user_id = $3
       RETURNING *`,
      [hours, earnedUsd, creatorUserId]
    );

    const updatedProfile = mapCreator(res.rows[0]);
    logger.info('Accrued creator earnings', { creatorUserId, earnedUsd, pending: updatedProfile.pendingPayoutUsd });

    return {
      earnedUsd,
      newPendingPayout: updatedProfile.pendingPayoutUsd,
    };
  },

  // ---- Request payout ---------------------------------------------------
  async requestPayout(userId: string): Promise<{ success: boolean; amount: number; message: string }> {
    const profile = await this.getProfile(userId);
    if (profile.pendingPayoutUsd < 10) {
      return { success: false, amount: profile.pendingPayoutUsd, message: 'Minimum payout threshold is $10 USD.' };
    }

    const payoutAmount = profile.pendingPayoutUsd;
    await query(
      `UPDATE creator_profiles
       SET pending_payout_usd = 0, paid_out_usd = paid_out_usd + $1, updated_at = NOW()
       WHERE user_id = $2`,
      [payoutAmount, userId]
    );

    logger.info('Creator payout initiated', { userId, payoutAmount });
    return {
      success: true,
      amount: payoutAmount,
      message: `Payout of $${payoutAmount.toFixed(2)} USD requested successfully to ${profile.payoutMethod || 'selected method'}.`,
    };
  },

  // ---- Admin approve creator --------------------------------------------
  async approveCreator(userId: string): Promise<CreatorProfile> {
    const res = await query<any>(
      `UPDATE creator_profiles
       SET status = 'approved', kyc_status = 'verified', approved_at = NOW(), updated_at = NOW()
       WHERE user_id = $1
       RETURNING *`,
      [userId]
    );
    return mapCreator(res.rows[0]);
  },
};
