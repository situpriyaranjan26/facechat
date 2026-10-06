import { query } from '../../db';
import { Block } from '../../types';
import { setKey, isMemberOfSet, addToSet, removeFromSet } from '../../utils/redis';
import { logEvent } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export async function blockUser(
  blockerUserId: string | null,
  blockerGuestId: string | null,
  blockedUserId: string | null,
  blockedGuestId: string | null,
  conversationId: string | null,
  blockType: 'session' | 'permanent' = 'session'
): Promise<Block> {
  const id = uuidv4();
  const blocker = blockerUserId || blockerGuestId;
  const blocked = blockedUserId || blockedGuestId;

  // Add to Redis quick set for matchmaking check
  if (blocker && blocked) {
    await addToSet(`blocked:${blocker}`, blocked);
  }

  const { rows } = await query(
    `INSERT INTO blocks 
     (id, blocker_user_id, blocker_guest_session_id, blocked_user_id, blocked_guest_session_id, conversation_id, block_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, blockerUserId, blockerGuestId, blockedUserId, blockedGuestId, conversationId, blockType]
  );

  logEvent('block_created', { blocker, blocked, blockType });
  return rows[0];
}

export async function isBlocked(idA: string, idB: string): Promise<boolean> {
  const aBlockedB = await isMemberOfSet(`blocked:${idA}`, idB);
  if (aBlockedB) return true;
  const bBlockedA = await isMemberOfSet(`blocked:${idB}`, idA);
  return bBlockedA;
}

export async function getBlockedList(userId: string) {
  const { rows } = await query(
    `SELECT b.*, u.display_name, u.avatar_url 
     FROM blocks b 
     LEFT JOIN users u ON b.blocked_user_id = u.id 
     WHERE b.blocker_user_id = $1`,
    [userId]
  );
  return rows;
}
