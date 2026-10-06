import { Router, Response } from 'express';
import { userService } from './userService';
import { requireAuth } from '../../middleware/auth';
import { validate, updateProfileSchema, updatePreferencesSchema } from '../../middleware/validate';
import { AuthenticatedRequest } from '../../types';

const router = Router();

// All user routes require authentication
router.use(requireAuth as any);

// GET /api/users/profile
router.get('/profile', async (req: any, res: Response) => {
  try {
    const user = await userService.getFullUser(req.user!.id);
    res.json({ user });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// PATCH /api/users/profile
router.patch(
  '/profile',
  validate(updateProfileSchema),
  async (req: any, res: Response) => {
    try {
      const user = await userService.updateProfile(req.user!.id, req.body);
      res.json({ user });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
);

// GET /api/users/stats
router.get('/stats', async (req: any, res: Response) => {
  try {
    const stats = await userService.getStats(req.user!.id);
    res.json({ stats });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// GET /api/users/achievements
router.get('/achievements', async (req: any, res: Response) => {
  try {
    const achievements = await userService.getAchievements(req.user!.id);
    res.json({ achievements });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// GET /api/users/preferences
router.get('/preferences', async (req: any, res: Response) => {
  try {
    const preferences = await userService.getPreferences(req.user!.id);
    res.json({ preferences });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// PATCH /api/users/preferences
router.patch(
  '/preferences',
  validate(updatePreferencesSchema),
  async (req: any, res: Response) => {
    try {
      const preferences = await userService.updatePreferences(req.user!.id, req.body.preference);
      res.json({ preferences });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
);

export default router;
