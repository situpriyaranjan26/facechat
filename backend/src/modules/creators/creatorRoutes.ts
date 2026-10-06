import { Router, Response } from 'express';
import { creatorService } from './creatorService';
import { requireAuth, requireAdmin } from '../../middleware/auth';

const router = Router();

// GET /api/creators/profile – get user's creator status & dashboard stats
router.get('/profile', requireAuth as any, async (req: any, res: Response) => {
  try {
    const profile = await creatorService.getProfile(req.user!.id);
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/creators/apply – apply for 750h Active Member Creator Program
router.post('/apply', requireAuth as any, async (req: any, res: Response) => {
  try {
    const { payoutMethod, payoutDetails } = req.body;
    const result = await creatorService.applyForCreator(
      req.user!.id,
      payoutMethod || 'paypal',
      payoutDetails || 'payout-account@example.com'
    );
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/creators/payout – request payout
router.post('/payout', requireAuth as any, async (req: any, res: Response) => {
  try {
    const result = await creatorService.requestPayout(req.user!.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/creators/:userId/approve – admin approve
router.post('/:userId/approve', requireAuth as any, requireAdmin as any, async (req: any, res: Response) => {
  try {
    const approved = await creatorService.approveCreator(req.params.userId);
    res.json({ success: true, profile: approved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
