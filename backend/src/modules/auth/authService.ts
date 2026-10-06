import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import { query, transaction } from '../../db';
import { logger } from '../../utils/logger';
import { User } from '../../types';
import { mapUserRow } from '../../middleware/auth';
import { walletService } from '../wallet/walletService';

// -----------------------------------------------------------------------
// Email transport
// -----------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: { user: config.email.user, pass: config.email.pass },
});

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await transporter.sendMail({ from: config.email.from, to, subject, html });
  } catch (err) {
    logger.error('Failed to send email', { to, subject, err });
  }
}

// -----------------------------------------------------------------------
// JWT helpers
// -----------------------------------------------------------------------
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });
}

// -----------------------------------------------------------------------
// Auth Service
// -----------------------------------------------------------------------
export const authService = {
  // ---- Register --------------------------------------------------------
  async register(
    email: string,
    password: string,
    displayName?: string,
    gender?: string,
    country?: string
  ): Promise<{ user: User; token: string }> {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      throw Object.assign(new Error('Email already in use'), { statusCode: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const userResult = await query<any>(
      `INSERT INTO users
         (email, password_hash, display_name, gender, country, email_verification_token)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [email, passwordHash, displayName || null, gender || 'prefer_not_to_say', country || 'Global', verificationToken]
    );
    const user = mapUserRow(userResult.rows[0]);

    // Create wallet + stats in parallel
    await Promise.all([
      walletService.createWallet(user.id),
      query(
        `INSERT INTO user_stats (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      ),
      query(
        `INSERT INTO matchmaking_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      ),
    ]);

    // Send verification email
    const verifyUrl = `${config.server.frontendUrl}/verify-email?token=${verificationToken}`;
    await sendEmail(
      email,
      'Verify your FaceChat email',
      `<p>Click <a href="${verifyUrl}">here</a> to verify your email address.</p>`
    );

    const token = generateToken(user.id);
    logger.info('User registered', { userId: user.id });
    return { user, token };
  },

  // ---- Login -----------------------------------------------------------
  async login(
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    const result = await query<any>(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    if (!result.rows.length) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const row = result.rows[0];
    if (!row.password_hash) {
      throw Object.assign(new Error('Please sign in with Google'), { statusCode: 400 });
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    if (row.is_banned) {
      throw Object.assign(new Error('Account is banned'), { statusCode: 403 });
    }

    const user = mapUserRow(row);
    const token = generateToken(user.id);

    await query(`UPDATE users SET last_seen_at = NOW() WHERE id = $1`, [user.id]);
    logger.info('User logged in', { userId: user.id });
    return { user, token };
  },

  // ---- Google OAuth (find or create) -----------------------------------
  async findOrCreateGoogleUser(profile: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  }): Promise<{ user: User; token: string; isNew: boolean }> {
    // Check by google_id first
    let result = await query<any>(
      `SELECT * FROM users WHERE google_id = $1`,
      [profile.id]
    );

    if (result.rows.length) {
      const user = mapUserRow(result.rows[0]);
      if (user.isBanned) {
        throw Object.assign(new Error('Account is banned'), { statusCode: 403 });
      }
      await query(`UPDATE users SET last_seen_at = NOW() WHERE id = $1`, [user.id]);
      return { user, token: generateToken(user.id), isNew: false };
    }

    // Check by email
    result = await query<any>(
      `SELECT * FROM users WHERE email = $1`,
      [profile.email]
    );

    if (result.rows.length) {
      // Link google account to existing email user
      const updated = await query<any>(
        `UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2),
         is_email_verified = true, last_seen_at = NOW()
         WHERE id = $3 RETURNING *`,
        [profile.id, profile.avatarUrl || null, result.rows[0].id]
      );
      const user = mapUserRow(updated.rows[0]);
      return { user, token: generateToken(user.id), isNew: false };
    }

    // Create new user
    const newResult = await query<any>(
      `INSERT INTO users (email, google_id, display_name, avatar_url, is_email_verified)
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [profile.email, profile.id, profile.displayName, profile.avatarUrl || null]
    );
    const newUser = mapUserRow(newResult.rows[0]);

    await Promise.all([
      walletService.createWallet(newUser.id),
      query(`INSERT INTO user_stats (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [newUser.id]),
      query(`INSERT INTO matchmaking_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [newUser.id]),
    ]);

    logger.info('New Google user created', { userId: newUser.id });
    return { user: newUser, token: generateToken(newUser.id), isNew: true };
  },

  // ---- Verify email ----------------------------------------------------
  async verifyEmail(token: string): Promise<void> {
    const result = await query<any>(
      `UPDATE users SET is_email_verified = true, email_verification_token = NULL
       WHERE email_verification_token = $1 RETURNING id`,
      [token]
    );
    if (!result.rows.length) {
      throw Object.assign(new Error('Invalid or expired verification token'), { statusCode: 400 });
    }
    logger.info('Email verified', { userId: result.rows[0].id });
  },

  // ---- Forgot password -------------------------------------------------
  async forgotPassword(email: string): Promise<void> {
    const result = await query<any>(`SELECT id FROM users WHERE email = $1`, [email]);
    if (!result.rows.length) {
      // Don't reveal whether email exists
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3`,
      [resetToken, expires, result.rows[0].id]
    );

    const resetUrl = `${config.server.frontendUrl}/reset-password?token=${resetToken}`;
    await sendEmail(
      email,
      'Reset your FaceChat password',
      `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`
    );
  },

  // ---- Reset password --------------------------------------------------
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const result = await query<any>(
      `SELECT id, password_reset_expires FROM users
       WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
      [token]
    );
    if (!result.rows.length) {
      throw Object.assign(new Error('Invalid or expired reset token'), { statusCode: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await query(
      `UPDATE users SET password_hash = $1, password_reset_token = NULL,
       password_reset_expires = NULL WHERE id = $2`,
      [passwordHash, result.rows[0].id]
    );
    logger.info('Password reset', { userId: result.rows[0].id });
  },

  // ---- Get me ----------------------------------------------------------
  async getMe(userId: string): Promise<User> {
    const result = await query<any>(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (!result.rows.length) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }
    return mapUserRow(result.rows[0]);
  },

  // ---- Delete account --------------------------------------------------
  async deleteAccount(userId: string): Promise<void> {
    await query(`DELETE FROM users WHERE id = $1`, [userId]);
    logger.info('Account deleted', { userId });
  },
};
