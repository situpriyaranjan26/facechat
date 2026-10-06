import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth';
import { query } from '../db';
import { getOverviewStats } from '../modules/analytics/analyticsService';

const router = Router();
router.use(requireAdmin as any);

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const stats = await getOverviewStats();
    res.json({ success: true, data: stats });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/users', async (req: Request, res: Response) => {
  try {
    const { rows } = await query(
      'SELECT id, email, display_name, country, is_banned, is_admin, created_at, last_seen_at FROM users ORDER BY created_at DESC LIMIT 50'
    );
    res.json({ success: true, data: rows });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/users/:id/ban', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    await query('UPDATE users SET is_banned = true, ban_reason = $1 WHERE id = $2', [reason || 'Violation of terms', req.params.id]);
    res.json({ success: true, message: 'User banned' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/users/:id/ban', async (req: Request, res: Response) => {
  try {
    await query('UPDATE users SET is_banned = false, ban_reason = NULL WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'User unbanned' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
