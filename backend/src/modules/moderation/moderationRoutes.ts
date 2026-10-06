import { Router } from 'express';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { blockUser, getBlockedList } from './blockService';
import { AuthenticatedRequest } from '../../types';

const router = Router();

router.post('/block', optionalAuth, async (req: any, res) => {
  try {
    const { blockedUserId, blockedGuestId, conversationId, blockType } = req.body;
    const block = await blockUser(
      req.user?.id || null,
      req.body.blockerGuestId || null,
      blockedUserId || null,
      blockedGuestId || null,
      conversationId || null,
      blockType || 'session'
    );
    res.json({ success: true, data: block });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/blocked', requireAuth, async (req: any, res) => {
  try {
    const list = await getBlockedList(req.user!.id);
    res.json({ success: true, data: list });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
