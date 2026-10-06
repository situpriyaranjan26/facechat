import { query } from '../../db';
import { AbuseEvent, AbuseSeverity } from '../../types';
import { increment, getKey } from '../../utils/redis';
import { logEvent, logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export async function checkRateLimit(identifier: string, action: string, maxPerHour: number): Promise<boolean> {
  const key = `ratelimit:${action}:${identifier}`;
  const count = await increment(key, 3600);
  return count <= maxPerHour;
}

export async function logAbuseEvent(
  userId: string | null,
  guestSessionId: string | null,
  eventType: string,
  severity: AbuseSeverity = 'low',
  metadata: Record<string, any> = {},
  ipAddress?: string
): Promise<AbuseEvent> {
  const id = uuidv4();
  const { rows } = await query(
    `INSERT INTO abuse_events (id, user_id, guest_session_id, event_type, severity, metadata, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, userId, guestSessionId, eventType, severity, JSON.stringify(metadata), ipAddress || null]
  );
  logger.warn('Abuse event detected', { eventType, severity, userId, guestSessionId });
  return rows[0];
}
