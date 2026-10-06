import { query } from '../../db';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { PartnerBooking, BookingStatus } from '../../types';

function mapBooking(r: any): PartnerBooking {
  return {
    id: r.id,
    requesterId: r.requester_id,
    partnerId: r.partner_id,
    status: r.status as BookingStatus,
    amountUsd: Number(r.amount_usd) || 5.0,
    partnerRevenueUsd: Number(r.partner_revenue_usd) || 2.5,
    platformRevenueUsd: Number(r.platform_revenue_usd) || 2.5,
    minutesUsed: Number(r.minutes_used) || 0,
    maxMinutes: Number(r.max_minutes) || 60,
    expiresAt: new Date(r.expires_at),
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export const partnerService = {
  // ---- Request a Preferred Partner Booking ($5 for 7 days / 60 mins) ----
  async requestBooking(requesterId: string, partnerId: string): Promise<PartnerBooking> {
    const durationDays = config.business.partnerPassDurationDays || 7;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 3600 * 1000);

    const result = await query<any>(
      `INSERT INTO partner_bookings (
         requester_id, partner_id, status, amount_usd, partner_revenue_usd,
         platform_revenue_usd, minutes_used, max_minutes, expires_at
       ) VALUES ($1, $2, 'requested', $3, $4, $5, 0, $6, $7)
       RETURNING *`,
      [
        requesterId,
        partnerId,
        config.business.partnerPassPriceUsd || 5.0,
        config.business.partnerCreatorSplitUsd || 2.5,
        config.business.partnerPlatformSplitUsd || 2.5,
        config.business.partnerTotalMinutes || 60,
        expiresAt,
      ]
    );

    logger.info('Preferred partner booking requested', { requesterId, partnerId, expiresAt });
    return mapBooking(result.rows[0]);
  },

  // ---- Partner accepts or declines booking ------------------------------
  async updateBookingStatus(
    bookingId: string,
    partnerId: string,
    newStatus: 'accepted' | 'declined'
  ): Promise<PartnerBooking> {
    const result = await query<any>(
      `UPDATE partner_bookings
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND partner_id = $3
       RETURNING *`,
      [newStatus, bookingId, partnerId]
    );

    if (!result.rows.length) {
      throw new Error('Booking not found or unauthorized');
    }

    logger.info('Partner updated booking status', { bookingId, partnerId, newStatus });
    return mapBooking(result.rows[0]);
  },

  // ---- Record minutes used in a partner call ----------------------------
  async recordMinutesUsed(bookingId: string, minutes: number): Promise<PartnerBooking> {
    const res = await query<any>(
      `SELECT * FROM partner_bookings WHERE id = $1`,
      [bookingId]
    );
    if (!res.rows.length) throw new Error('Booking not found');

    const booking = mapBooking(res.rows[0]);
    const newUsed = Math.min(booking.maxMinutes, booking.minutesUsed + minutes);
    const newStatus = newUsed >= booking.maxMinutes ? 'completed' : booking.status;

    const updated = await query<any>(
      `UPDATE partner_bookings
       SET minutes_used = $1, status = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [newUsed, newStatus, bookingId]
    );

    return mapBooking(updated.rows[0]);
  },

  // ---- Get active booking between two users -----------------------------
  async getActiveBooking(userAId: string, userBId: string): Promise<PartnerBooking | null> {
    const result = await query<any>(
      `SELECT * FROM partner_bookings
       WHERE ((requester_id = $1 AND partner_id = $2) OR (requester_id = $2 AND partner_id = $1))
         AND status = 'accepted' AND expires_at > NOW() AND minutes_used < max_minutes
       ORDER BY expires_at DESC LIMIT 1`,
      [userAId, userBId]
    );

    return result.rows.length ? mapBooking(result.rows[0]) : null;
  },

  // ---- List bookings for user (as partner or requester) -----------------
  async listUserBookings(userId: string): Promise<{ requested: PartnerBooking[]; received: PartnerBooking[] }> {
    const requested = await query<any>(
      `SELECT * FROM partner_bookings WHERE requester_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    const received = await query<any>(
      `SELECT * FROM partner_bookings WHERE partner_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return {
      requested: requested.rows.map(mapBooking),
      received: received.rows.map(mapBooking),
    };
  },
};
