import { Router, Response } from 'express';
import { adService } from './adService';
import { optionalAuth } from '../../middleware/auth';

const router = Router();

// GET /api/ads/eligibility
router.get('/eligibility', optionalAuth as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    const result = await adService.checkAdEligibility(userId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
