import { Router, Response } from 'express';
import { subscriptionService } from './subscriptionService';
import { preferenceService } from './preferenceService';
import { requireAuth } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../types';
import { FEMALE_PASS_PRODUCT } from '../../types';

const router = Router();

router.use(requireAuth as any);

// GET /api/subscriptions/status
router.get('/status', async (req: any, res: Response) => {
  try {
    const subscriptions = await subscriptionService.getUserSubscriptions(req.user!.id);
    const preference = await preferenceService.getStatus(req.user!.id);
    res.json({ subscriptions, preference });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// GET /api/subscriptions/preference-pass
router.get('/preference-pass', async (req: any, res: Response) => {
  try {
    const status = await preferenceService.getStatus(req.user!.id);
    res.json(status);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// POST /api/subscriptions/preference-pass/toggle
router.post('/preference-pass/toggle', async (req: any, res: Response) => {
  try {
    const { isActive } = req.body;
    const pass = await preferenceService.togglePreference(req.user!.id, !!isActive);
    const status = await preferenceService.getStatus(req.user!.id);
    res.json({ success: true, preference: status });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Legacy GET /api/subscriptions/female-pass
router.get('/female-pass', async (req: any, res: Response) => {
  try {
    const status = await preferenceService.getStatus(req.user!.id);
    res.json({
      isActive: status.isActive && status.hasPass,
      remainingSeconds: status.remainingSeconds,
      formattedTime: status.formattedTime,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

export default router;
