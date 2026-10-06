import { query } from '../../db';
import { logEvent } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export async function track(
  eventName: string,
  userId: string | null,
  guestSessionId: string | null,
  anonymousId: string | null,
  properties: Record<string, any> = {},
  ipAddress?: string,
  userAgent?: string
) {
  const id = uuidv4();
  await query(
    `INSERT INTO analytics_events 
     (id, event_name, user_id, guest_session_id, anonymous_id, properties, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, eventName, userId, guestSessionId, anonymousId, JSON.stringify(properties), ipAddress || null, userAgent || null]
  );
  logEvent(eventName, { userId, guestSessionId, ...properties });
}

export async function getOverviewStats() {
  const { rows: users } = await query('SELECT COUNT(*) as count FROM users');
  const { rows: conversations } = await query('SELECT COUNT(*) as count, AVG(duration_seconds) as avg_duration FROM conversations');
  const { rows: revenue } = await query("SELECT SUM(amount_usd) as total FROM coin_purchases WHERE status = 'completed'");
  const { rows: activeSubs } = await query("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active' AND expiry_time > NOW()");
  const { rows: reports } = await query("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'");

  return {
    totalUsers: parseInt(users[0]?.count || '0', 10),
    totalConversations: parseInt(conversations[0]?.count || '0', 10),
    avgDurationSeconds: Math.round(parseFloat(conversations[0]?.avg_duration || '0')),
    totalRevenueUsd: parseFloat(revenue[0]?.total || '0'),
    activeFemalePasses: parseInt(activeSubs[0]?.count || '0', 10),
    pendingReports: parseInt(reports[0]?.count || '0', 10),
  };
}
