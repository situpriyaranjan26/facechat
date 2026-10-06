import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../db';
import { logger } from '../utils/logger';
import { User, AuthenticatedRequest } from '../types';

// -----------------------------------------------------------------------
// Helper: extract JWT from Authorization header or cookie
// -----------------------------------------------------------------------
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  if ((req as any).cookies?.token) {
    return (req as any).cookies.token;
  }
  return null;
}

// -----------------------------------------------------------------------
// requireAuth – hard auth gate (returns 401 if not authenticated)
// -----------------------------------------------------------------------
export async function requireAuth(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; iat: number; exp: number };
    const result = await query<User>(
      `SELECT * FROM users WHERE id = $1 AND is_banned = false`,
      [decoded.userId]
    );

    if (!result.rows.length) {
      res.status(401).json({ error: 'User not found or banned' });
      return;
    }

    req.user = result.rows[0];

    // Update last_seen_at (fire and forget)
    query(`UPDATE users SET last_seen_at = NOW() WHERE id = $1`, [decoded.userId]).catch(() => {});

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expired' });
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
}

// -----------------------------------------------------------------------
// optionalAuth – attaches user if token present, continues regardless
// -----------------------------------------------------------------------
export async function optionalAuth(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    const result = await query<User>(
      `SELECT * FROM users WHERE id = $1 AND is_banned = false`,
      [decoded.userId]
    );
    if (result.rows.length) {
      req.user = result.rows[0];
    }
  } catch {
    // token invalid – that's fine for optional auth
  }
  next();
}

// -----------------------------------------------------------------------
// requireAdmin – must be authenticated AND is_admin = true
// -----------------------------------------------------------------------
export async function requireAdmin(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, async () => {
    if (!req.user?.isAdmin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
}

// -----------------------------------------------------------------------
// mapUserRow – convert snake_case DB row → camelCase User object
// -----------------------------------------------------------------------
export function mapUserRow(row: any): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    googleId: row.google_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    country: row.country,
    languages: row.languages || [],
    interests: row.interests || [],
    isEmailVerified: row.is_email_verified,
    emailVerificationToken: row.email_verification_token,
    passwordResetToken: row.password_reset_token,
    passwordResetExpires: row.password_reset_expires,
    gender: row.gender,
    isAdmin: row.is_admin,
    isBanned: row.is_banned,
    banReason: row.ban_reason,
    banExpiresAt: row.ban_expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at,
  };
}
