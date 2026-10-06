import { Router } from 'express';
import { createGuestSession, getGuestTimeRemaining, convertGuestToUser, validateGuestSession } from './guestService';
import { requireAuth } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../types';

const router = Router();

router.post('/session', async (req, res) => {
  try {
    const { fingerprint, username, country, gender, isAgeConfirmed } = req.body;
    const cloudCountry = (req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || req.headers['x-country-code']) as string | undefined;
    const finalCountry = cloudCountry || country || 'US';
    const session = await createGuestSession(
      req.ip,
      req.headers['user-agent'],
      fingerprint,
      username,
      finalCountry,
      gender,
      isAgeConfirmed !== false
    );
    res.json({ success: true, data: session });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    const token = (req.query.token as string) || (req.headers['x-guest-token'] as string);
    if (!token) return res.status(400).json({ success: false, error: 'Token required' });
    const status = await getGuestTimeRemaining(token);
    const guest = await validateGuestSession(token);
    res.json({ success: true, data: { ...status, tokens: guest?.tokens ?? 10 } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/convert', requireAuth, async (req: any, res) => {
  try {
    const { guestToken } = req.body;
    if (!guestToken) return res.status(400).json({ success: false, error: 'guestToken required' });
    const ok = await convertGuestToUser(guestToken, req.user!.id);
    res.json({ success: true, data: { converted: ok } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
