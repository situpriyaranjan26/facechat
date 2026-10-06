import { Router, Response } from 'express';
import { loyaltyService } from './loyaltyService';
import { requireAuth } from '../../middleware/auth';
import { config } from '../../config';

const router = Router();

router.use(requireAuth as any);

// GET /api/loyalty/progress – get user's loyalty progress & milestone list
router.get('/progress', async (req: any, res: Response) => {
  try {
    const progress = await loyaltyService.getProgress(req.user!.id);
    const rewards = await loyaltyService.getUserRewards(req.user!.id);
    res.json({
      success: true,
      progress,
      rewards,
      milestones: config.business.loyaltyMilestones,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/loyalty/claim – claim physical milestone merchandise
router.post('/claim', async (req: any, res: Response) => {
  try {
    const { milestoneDays, shippingName, shippingAddress, shippingCountry } = req.body;
    if (!milestoneDays || !shippingName || !shippingAddress || !shippingCountry) {
      return res.status(400).json({ error: 'All shipping details are required' });
    }

    const claim = await loyaltyService.claimReward(
      req.user!.id,
      Number(milestoneDays),
      shippingName,
      shippingAddress,
      shippingCountry
    );

    res.json({ success: true, claim });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
