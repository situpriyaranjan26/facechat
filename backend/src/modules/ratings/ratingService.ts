import { query } from '../../db';
import { logger } from '../../utils/logger';
import { StarRating } from '../../types';

export const ratingService = {
  // ---- Submit a star rating at end of call ------------------------------
  async submitRating(
    conversationId: string,
    raterUserId: string,
    ratedUserId: string,
    stars: number,
    feedbackTags: string[] = []
  ): Promise<StarRating> {
    const clampedStars = Math.min(5, Math.max(1, Math.round(stars)));

    const result = await query<any>(
      `INSERT INTO star_ratings (conversation_id, rater_user_id, rated_user_id, stars, feedback_tags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [conversationId, raterUserId, ratedUserId, clampedStars, feedbackTags]
    );

    // Recalculate user's aggregate star score
    await this.updateUserAggregateScore(ratedUserId);

    logger.info('Star rating recorded', { raterUserId, ratedUserId, stars: clampedStars });

    const row = result.rows[0];
    return {
      id: row.id,
      conversationId: row.conversation_id,
      raterUserId: row.rater_user_id,
      ratedUserId: row.rated_user_id,
      stars: Number(row.stars),
      feedbackTags: row.feedback_tags || [],
      createdAt: new Date(row.created_at),
    };
  },

  // ---- Server-authoritative aggregate score calculation -----------------
  async updateUserAggregateScore(userId: string): Promise<number> {
    const ratings = await query<any>(
      `SELECT stars FROM star_ratings WHERE rated_user_id = $1`,
      [userId]
    );

    let avgStars = 5.0;
    if (ratings.rows.length > 0) {
      const sum = ratings.rows.reduce((acc: number, r: any) => acc + Number(r.stars), 0);
      avgStars = Number((sum / ratings.rows.length).toFixed(2));
    }

    // Check penalty from valid reports against user
    const reports = await query<any>(
      `SELECT COUNT(*) as total FROM reports WHERE reported_user_id = $1 AND status = 'actioned'`,
      [userId]
    );
    const actionedReports = parseInt(reports.rows[0]?.total || '0', 10);
    const reportPenalty = actionedReports * 0.2;

    const finalRating = Math.max(1.0, Math.min(5.0, Number((avgStars - reportPenalty).toFixed(2))));

    // Update in user record and user_stats
    await query(
      `UPDATE users SET star_rating = $1, updated_at = NOW() WHERE id = $2`,
      [finalRating, userId]
    );
    await query(
      `UPDATE user_stats SET star_rating = $1, updated_at = NOW() WHERE user_id = $2`,
      [finalRating, userId]
    );

    return finalRating;
  },

  // ---- Get rating summary for user --------------------------------------
  async getRatingSummary(userId: string): Promise<{
    starRating: number;
    totalRatings: number;
    breakdown: Record<number, number>;
  }> {
    const ratings = await query<any>(
      `SELECT stars FROM star_ratings WHERE rated_user_id = $1`,
      [userId]
    );

    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    ratings.rows.forEach((r: any) => {
      const s = Math.round(Number(r.stars));
      if (breakdown[s] !== undefined) breakdown[s]++;
      sum += Number(r.stars);
    });

    const total = ratings.rows.length;
    const avg = total > 0 ? Number((sum / total).toFixed(2)) : 5.0;

    return {
      starRating: avg,
      totalRatings: total,
      breakdown,
    };
  },
};
