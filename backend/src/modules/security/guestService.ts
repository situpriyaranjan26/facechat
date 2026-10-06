import { query } from '../../db';
import { config } from '../../config';
import { GuestSession, Gender } from '../../types';
import { logEvent } from '../../utils/logger';
import crypto from 'crypto';

export async function createGuestSession(
  ipAddress?: string,
  userAgent?: string,
  fingerprint?: string,
  username?: string,
  country?: string,
  gender?: Gender,
  isAgeConfirmed: boolean = true
): Promise<GuestSession> {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const durationMs = config.business.guestFreeMinutes * 60 * 1000;
  const expiresAt = new Date(Date.now() + durationMs);

  const initialTokens = config.business.initialFaceTokens || 10;
  const { rows } = await query(
    `INSERT INTO guest_sessions (session_token, ip_address, user_agent, expires_at, fingerprint, username, country, gender, is_age_confirmed, tokens)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      sessionToken,
      ipAddress || null,
      userAgent || null,
      expiresAt,
      fingerprint || null,
      username || 'Stranger',
      country || 'Global',
      gender || 'prefer_not_to_say',
      isAgeConfirmed,
      initialTokens,
    ]
  );

  logEvent('guest_started', { sessionToken, expiresAt, username, country, gender, initialTokens });
  return mapGuest(rows[0]);
}

function mapGuest(row: any): GuestSession {
  return {
    id: row.id,
    sessionToken: row.session_token,
    username: row.username || 'Stranger',
    country: row.country || 'Global',
    gender: row.gender || 'prefer_not_to_say',
    isAgeConfirmed: !!row.is_age_confirmed,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    convertedUserId: row.converted_user_id,
    totalMinutesUsed: row.total_minutes_used || 0,
    lastActiveAt: row.last_active_at,
    fingerprint: row.fingerprint,
    tokens: row.tokens !== undefined && row.tokens !== null ? Number(row.tokens) : (config.business.initialFaceTokens || 10),
    isActive: row.is_active,
  };
}

export async function getGuestTokens(sessionToken: string): Promise<number> {
  const { rows } = await query('SELECT tokens FROM guest_sessions WHERE session_token = $1', [sessionToken]);
  if (!rows[0] || rows[0].tokens === undefined || rows[0].tokens === null) {
    return config.business.initialFaceTokens || 10;
  }
  return Number(rows[0].tokens);
}

export async function updateGuestTokens(sessionToken: string, delta: number): Promise<number> {
  const current = await getGuestTokens(sessionToken);
  const newBal = Math.max(0, current + delta);
  await query('UPDATE guest_sessions SET tokens = $1 WHERE session_token = $2', [newBal, sessionToken]);
  return newBal;
}

export async function validateGuestSession(sessionToken: string): Promise<GuestSession | null> {
  const { rows } = await query(
    `SELECT * FROM guest_sessions 
     WHERE session_token = $1 AND is_active = true`,
    [sessionToken]
  );
  return rows[0] ? mapGuest(rows[0]) : null;
}

export async function getGuestTimeRemaining(sessionToken: string): Promise<{
  secondsRemaining: number;
  isExpired: boolean;
  shouldShowWarning: boolean;
  username?: string;
  country?: string;
  gender?: Gender;
}> {
  const session = await validateGuestSession(sessionToken);
  if (!session) {
    return { secondsRemaining: 0, isExpired: true, shouldShowWarning: false };
  }

  const now = Date.now();
  const expires = new Date(session.expiresAt).getTime();
  const msRemaining = Math.max(0, expires - now);
  const secondsRemaining = Math.floor(msRemaining / 1000);
  const isExpired = secondsRemaining <= 0;

  const warningThresholdSeconds = config.business.guestWarningMinutes * 60;
  const shouldShowWarning = !isExpired && secondsRemaining <= warningThresholdSeconds;

  return {
    secondsRemaining,
    isExpired,
    shouldShowWarning,
    username: session.username,
    country: session.country,
    gender: session.gender,
  };
}

export async function convertGuestToUser(sessionToken: string, userId: string): Promise<boolean> {
  const { rows } = await query(
    `UPDATE guest_sessions 
     SET converted_user_id = $1, is_active = false
     WHERE session_token = $2
     RETURNING *`,
    [userId, sessionToken]
  );
  if (rows[0]) {
    logEvent('guest_converted', { sessionToken, userId });
    return true;
  }
  return false;
}

export const guestService = {
  createGuestSession,
  validateGuestSession,
  getGuestTimeRemaining,
  convertGuestToUser,
};
