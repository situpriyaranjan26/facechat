import { Router } from 'express';
import { optionalAuth, requireAdmin } from '../../middleware/auth';
import { track, getOverviewStats } from './analyticsService';
import { AuthenticatedRequest } from '../../types';

const router = Router();

router.post('/event', optionalAuth, async (req: any, res) => {
  try {
    const { eventName, anonymousId, properties, guestSessionId } = req.body;
    if (!eventName) return res.status(400).json({ success: false, error: 'eventName required' });

    await track(
      eventName,
      req.user?.id || null,
      guestSessionId || null,
      anonymousId || null,
      properties || {},
      req.ip,
      req.headers['user-agent']
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/overview', requireAdmin, async (req, res) => {
  try {
    const stats = await getOverviewStats();
    res.json({ success: true, data: stats });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
