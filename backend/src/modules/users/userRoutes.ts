import { Router, Response } from 'express';
import { userService } from './userService';
import { requireAuth } from '../../middleware/auth';
import { validate, updateProfileSchema, updatePreferencesSchema } from '../../middleware/validate';
import { AuthenticatedRequest } from '../../types';

const router = Router();

// GET /api/users/active - Public showcase of most active verified users
router.get('/active', async (_req, res: Response) => {
  const activeUsers = [
    {
      id: 'usr_maya_01',
      displayName: 'Maya Lin',
      country: 'Japan 🇯🇵',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      bio: 'Tokyo nightlife & street photography lover 📸 Let\'s talk music and travel!',
      hourlyRateUSD: 2,
      hourlyRateINR: 165,
      isOnline: true,
      languages: ['English', 'Japanese'],
      rating: 4.9,
      callsCompleted: 142,
      interests: ['Photography', 'J-Rock', 'Travel'],
    },
    {
      id: 'usr_elena_02',
      displayName: 'Elena Rostova',
      country: 'Spain 🇪🇸',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
      bio: 'Architecture student in Barcelona 🏛️ Fluent in 3 languages, loves deep late night chats!',
      hourlyRateUSD: 2,
      hourlyRateINR: 165,
      isOnline: true,
      languages: ['English', 'Spanish', 'French'],
      rating: 5.0,
      callsCompleted: 218,
      interests: ['Architecture', 'Art', 'Coffee'],
    },
    {
      id: 'usr_liam_03',
      displayName: 'Liam Davies',
      country: 'United Kingdom 🇬🇧',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80',
      bio: 'London indie guitarist & traveler 🎸 Always down for meaningful conversations.',
      hourlyRateUSD: 2,
      hourlyRateINR: 165,
      isOnline: true,
      languages: ['English'],
      rating: 4.8,
      callsCompleted: 98,
      interests: ['Guitar', 'Indie Rock', 'Backpacking'],
    },
    {
      id: 'usr_ananya_04',
      displayName: 'Ananya Sharma',
      country: 'India 🇮🇳',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
      bio: 'AI researcher & podcast host in Bengaluru ☕ Love discussing philosophy and startups!',
      hourlyRateUSD: 2,
      hourlyRateINR: 165,
      isOnline: true,
      languages: ['English', 'Hindi'],
      rating: 4.9,
      callsCompleted: 310,
      interests: ['AI', 'Tech', 'Podcasts'],
    },
    {
      id: 'usr_lucas_05',
      displayName: 'Lucas Silva',
      country: 'Brazil 🇧🇷',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
      bio: 'Surfer & DJ based in Rio de Janeiro 🏄‍♂️ Bringing positive vibes and good tunes.',
      hourlyRateUSD: 2,
      hourlyRateINR: 165,
      isOnline: true,
      languages: ['English', 'Portuguese'],
      rating: 4.9,
      callsCompleted: 175,
      interests: ['Surfing', 'Electronic Music', 'Cooking'],
    },
    {
      id: 'usr_chloe_06',
      displayName: 'Chloe Martin',
      country: 'France 🇫🇷',
      avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
      bio: 'Fashion designer in Paris 🎨 Friendly, warm, and excited to meet global friends.',
      hourlyRateUSD: 2,
      hourlyRateINR: 165,
      isOnline: true,
      languages: ['English', 'French'],
      rating: 5.0,
      callsCompleted: 260,
      interests: ['Fashion', 'Cinema', 'Wine'],
    },
  ];
  res.json({ success: true, activeUsers });
});

// All user routes below require authentication
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
