import { Router } from 'express';
import { optionalAuth, requireAdmin } from '../../middleware/auth';
import { createReport, getReports, updateReportStatus } from './reportService';
import { AuthenticatedRequest } from '../../types';

const router = Router();

router.post('/', optionalAuth, async (req: any, res) => {
  try {
    const { reportedUserId, reportedGuestSessionId, conversationId, reason, description } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'Reason required' });

    const report = await createReport(
      req.user?.id || null,
      req.body.reporterGuestSessionId || null,
      reportedUserId || null,
      reportedGuestSessionId || null,
      conversationId || null,
      reason,
      description,
      { ip: req.ip, userAgent: req.headers['user-agent'] }
    );
    res.json({ success: true, data: report });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/', requireAdmin, async (req: any, res) => {
  try {
    const { status, limit, offset } = req.query;
    const data = await getReports(status as any, Number(limit) || 50, Number(offset) || 0);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.patch('/:id', requireAdmin, async (req: any, res) => {
  try {
    const { status, actionTaken } = req.body;
    const updated = await updateReportStatus(req.params.id, status, actionTaken, req.user!.id);
    res.json({ success: true, data: updated });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
