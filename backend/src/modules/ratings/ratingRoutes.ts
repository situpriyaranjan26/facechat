import { Router, Response } from 'express';
import { ratingService } from './ratingService';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// POST /api/ratings – submit star rating for completed call
router.post('/', requireAuth as any, async (req: any, res: Response) => {
  try {
    const { conversationId, ratedUserId, stars, feedbackTags } = req.body;
    if (!ratedUserId || !stars) {
      return res.status(400).json({ error: 'ratedUserId and stars are required' });
    }

    const rating = await ratingService.submitRating(
      conversationId || '',
      req.user!.id,
      ratedUserId,
      Number(stars),
      feedbackTags || []
    );

    res.json({ success: true, rating });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ratings/user/:id – get user star rating summary
router.get('/user/:id', async (req: any, res: Response) => {
  try {
    const summary = await ratingService.getRatingSummary(req.params.id);
    res.json({ success: true, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
