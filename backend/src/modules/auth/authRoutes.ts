import { Router, Request, Response } from 'express';
import passport from 'passport';
import { authService, generateToken } from './authService';
import { requireAuth } from '../../middleware/auth';
import { authLimiter, passwordResetLimiter } from '../../middleware/rateLimiter';
import { validate, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../../middleware/validate';
import { AuthenticatedRequest } from '../../types';
import { config } from '../../config';
import { logger } from '../../utils/logger';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password, displayName, gender, country } = req.body;
      const { user, token } = await authService.register(email, password, displayName, gender, country);
      res.cookie('token', token, {
        httpOnly: true,
        secure: config.server.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.status(201).json({
        message: 'Registration successful. Please verify your email.',
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const { user, token } = await authService.login(email, password);
      res.cookie('token', token, {
        httpOnly: true,
        secure: config.server.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName, isAdmin: user.isAdmin } });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
);

// GET /api/auth/google
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// GET /api/auth/google/callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${config.server.frontendUrl}/login?error=oauth_failed` }),
  (req: any, res: Response) => {
    const { user, token } = req.user as any;
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.server.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect(`${config.server.frontendUrl}/auth/callback?token=${token}`);
  }
);

// GET /api/auth/verify-email
router.get('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.query as { token: string };
    if (!token) {
      res.status(400).json({ error: 'Token required' });
      return;
    }
    await authService.verifyEmail(token);
    res.json({ message: 'Email verified successfully' });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  async (req: Request, res: Response) => {
    try {
      await authService.forgotPassword(req.body.email);
      res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  async (req: Request, res: Response) => {
    try {
      await authService.resetPassword(req.body.token, req.body.password);
      res.json({ message: 'Password reset successful' });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
);

// GET /api/auth/me
router.get('/me', requireAuth as any, async (req: any, res: Response) => {
  try {
    const user = await authService.getMe(req.user!.id);
    res.json({ user });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// DELETE /api/auth/account
router.delete('/account', requireAuth as any, async (req: any, res: Response) => {
  try {
    await authService.deleteAccount(req.user!.id);
    res.clearCookie('token');
    res.json({ message: 'Account deleted' });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

export default router;
