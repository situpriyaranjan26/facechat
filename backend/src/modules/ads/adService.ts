import { query } from '../../db';
import { config } from '../../config';

export const adService = {
  // ---- Check if user is eligible to receive ads (24 verified conversation hours) ----
  async checkAdEligibility(userId?: string): Promise<{
    shouldShowAds: boolean;
    verifiedHours: number;
    thresholdHours: number;
    adUnit?: {
      id: string;
      title: string;
      sponsor: string;
      ctaText: string;
      linkUrl: string;
      imageUrl: string;
    };
  }> {
    const thresholdHours = config.business.adsAfterHours || 24;

    if (!userId) {
      return { shouldShowAds: false, verifiedHours: 0, thresholdHours };
    }

    const statsRes = await query<any>(
      `SELECT total_conversation_minutes FROM user_stats WHERE user_id = $1`,
      [userId]
    );
    const totalMinutes = Number(statsRes.rows[0]?.total_conversation_minutes || 0);
    const verifiedHours = Number((totalMinutes / 60).toFixed(2));

    // Check if user has active paid preference pass or purchases
    const purchasesRes = await query<any>(
      `SELECT COUNT(*) as cnt FROM coin_purchases WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );
    const hasPurchased = Number(purchasesRes.rows[0]?.cnt || 0) > 0;

    // Show ads only to free users who have reached 24 verified hours
    const shouldShowAds = !hasPurchased && verifiedHours >= thresholdHours;

    const sampleAd = {
      id: 'ad_facechat_partner_spotlight',
      title: 'FaceChat Pro Creator Headsets',
      sponsor: 'FaceChat Audio Labs',
      ctaText: 'Learn More',
      linkUrl: 'https://facechat.app/creator-gear',
      imageUrl: '/images/ad_banner.png',
    };

    return {
      shouldShowAds,
      verifiedHours,
      thresholdHours,
      adUnit: shouldShowAds ? sampleAd : undefined,
    };
  },
};
