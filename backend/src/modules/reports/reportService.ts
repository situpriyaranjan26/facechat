import { query } from '../../db';
import { Report, ReportStatus } from '../../types';
import { logger, logEvent } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export async function createReport(
  reporterUserId: string | null,
  reporterGuestSessionId: string | null,
  reportedUserId: string | null,
  reportedGuestSessionId: string | null,
  conversationId: string | null,
  reason: string,
  description?: string,
  metadata: Record<string, any> = {}
): Promise<Report> {
  const id = uuidv4();
  const { rows } = await query(
    `INSERT INTO reports 
     (id, reporter_user_id, reporter_guest_session_id, reported_user_id, reported_guest_session_id, conversation_id, reason, description, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [id, reporterUserId, reporterGuestSessionId, reportedUserId, reportedGuestSessionId, conversationId, reason, description || null, JSON.stringify(metadata)]
  );

  logEvent('report_created', {
    reportId: id,
    reporterUserId,
    reportedUserId,
    reason,
  });

  return rows[0];
}

export async function getReports(status?: ReportStatus, limit = 50, offset = 0) {
  let q = 'SELECT * FROM reports';
  const params: any[] = [];
  if (status) {
    q += ' WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    params.push(status, limit, offset);
  } else {
    q += ' ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    params.push(limit, offset);
  }
  const { rows } = await query(q, params);
  const { rows: countRows } = await query('SELECT COUNT(*) as total FROM reports' + (status ? ' WHERE status = $1' : ''), status ? [status] : []);
  return { reports: rows, total: parseInt(countRows[0].total, 10) };
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  actionTaken: string,
  reviewedBy: string
) {
  const { rows } = await query(
    `UPDATE reports 
     SET status = $1, action_taken = $2, reviewed_by = $3, reviewed_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [status, actionTaken, reviewedBy, reportId]
  );
  return rows[0];
}
