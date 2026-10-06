import { Router } from 'express';
import { optionalAuth } from '../../middleware/auth';
import { getConversation, endConversation } from './conversationService';
import { AuthenticatedRequest } from '../../types';

const router = Router();

router.get('/:id', optionalAuth, async (req: any, res) => {
  try {
    const conv = await getConversation(req.params.id);
    if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });
    res.json({ success: true, data: conv });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/:id/end', optionalAuth, async (req: any, res) => {
  try {
    const { reason } = req.body;
    const endedBy = req.user?.id || req.body.guestSessionId || 'unknown';
    const conv = await endConversation(req.params.id, endedBy, reason || 'user_ended');
    res.json({ success: true, data: conv });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
