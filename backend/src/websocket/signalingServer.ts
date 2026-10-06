import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger, logEvent } from '../utils/logger';
import { createConversation, startConversation, endConversation } from '../modules/conversations/conversationService';
import { isBlocked } from '../modules/moderation/blockService';
import { validateGuestSession, getGuestTimeRemaining, getGuestTokens, updateGuestTokens, createGuestSession } from '../modules/security/guestService';
import { preferenceService } from '../modules/subscriptions/preferenceService';
import { walletService, getBalance } from '../modules/wallet/walletService';
import { ratingService } from '../modules/ratings/ratingService';
import { v4 as uuidv4 } from 'uuid';

interface ClientSession {
  socketId: string;
  userId?: string;
  guestSessionId?: string;
  guestToken?: string;
  isGuest: boolean;
  preference: 'anyone' | 'female' | 'male';
  gender?: string;
  country?: string;
  photo?: string;
  acceptedMatch?: boolean;
  matchedPeerSocketId?: string;
  activeConversationId?: string;
  minuteTimer?: NodeJS.Timeout;
}

const activeSockets = new Map<string, ClientSession>();
const waitingQueue: ClientSession[] = [];
// In-memory socket fallback balance map to guarantee tokens never get lost
const socketBalanceMap = new Map<string, number>();

// Helper to get balance for registered user, guest, or fallback socket session
async function getUserOrGuestBalance(session: ClientSession): Promise<number> {
  let bal = 0;
  if (session.userId) {
    try {
      bal = await getBalance(session.userId);
    } catch {
      bal = 0;
    }
  } else if (session.guestToken) {
    try {
      const b = await getGuestTokens(session.guestToken);
      if (typeof b === 'number') bal = b;
    } catch {
      // Fall through to in-memory fallback
    }
  } else {
    if (!socketBalanceMap.has(session.socketId)) {
      socketBalanceMap.set(session.socketId, config.business.initialGuestFaceTokens || 10);
    }
    bal = socketBalanceMap.get(session.socketId) || 10;
  }

  // TEST MODE AUTO-REFILL: If balance is 0 or less, auto-refill +10 tokens
  if (bal <= 0) {
    bal = 10;
    if (session.userId) {
      walletService.addTransaction(
        session.userId,
        10,
        'BONUS',
        '🧪 Test Mode Auto-Refill (+10 Tokens)',
        `test-refill:${session.userId}:${Date.now()}`
      ).catch(() => {});
    } else if (session.guestToken) {
      updateGuestTokens(session.guestToken, 10).catch(() => {});
    }
    socketBalanceMap.set(session.socketId, 10);
  }

  return bal;
}

// Helper to adjust balance for either registered user or guest
async function adjustUserOrGuestBalance(session: ClientSession, delta: number): Promise<number> {
  let next = 0;
  if (session.userId) {
    try {
      if (delta > 0) {
        await walletService.addTransaction(
          session.userId,
          delta,
          'CONVERSATION_REWARD',
          'Active 1-min call reward',
          `call-reward-${uuidv4()}`
        );
      } else if (delta < 0) {
        await walletService.addTransaction(
          session.userId,
          Math.abs(delta),
          'SKIP_PENALTY',
          'Stranger skip penalty',
          `skip-penalty-${uuidv4()}`
        );
      }
      next = await getBalance(session.userId);
    } catch {
      next = 0;
    }
  } else if (session.guestToken) {
    try {
      const res = await updateGuestTokens(session.guestToken, delta);
      socketBalanceMap.set(session.socketId, res);
      next = res;
    } catch {
      // Fallback
    }
  } else {
    // Socket ID fallback
    const cur = socketBalanceMap.get(session.socketId) ?? (config.business.initialGuestFaceTokens || 10);
    next = cur + delta;
  }

  // TEST MODE AUTO-REFILL: If balance reaches 0 or less, auto-refill +10 tokens
  if (next <= 0) {
    next = 10;
    if (session.userId) {
      walletService.addTransaction(
        session.userId,
        10,
        'BONUS',
        '🧪 Test Mode Auto-Refill (+10 Tokens)',
        `test-refill:${session.userId}:${Date.now()}`
      ).catch(() => {});
    } else if (session.guestToken) {
      updateGuestTokens(session.guestToken, 10).catch(() => {});
    }
    socketBalanceMap.set(session.socketId, 10);
  } else {
    socketBalanceMap.set(session.socketId, next);
  }

  return next;
}

// Starts the 1-minute recurring reward ticker (+1 Face Token every 60s for BOTH users)
function startMinuteRewardTicker(sessionA: ClientSession, sessionB: ClientSession, io: SocketIOServer) {
  if (sessionA.minuteTimer) clearInterval(sessionA.minuteTimer);
  if (sessionB.minuteTimer) clearInterval(sessionB.minuteTimer);

  const timer = setInterval(async () => {
    // If conversation no longer active, stop ticker
    if (!sessionA.activeConversationId || !sessionA.matchedPeerSocketId) {
      clearInterval(timer);
      return;
    }

    // Award +1 Face Token to Session A
    const balA = await adjustUserOrGuestBalance(sessionA, 1);
    io.to(sessionA.socketId).emit('token_reward', {
      amount: 1,
      balance: balA,
      message: '+1 Face Token earned for 1 min conversation! 🪙',
    });

    // Award +1 Face Token to Session B (if real peer)
    if (sessionB.socketId && sessionB.socketId !== 'simulated_stranger_bot') {
      const balB = await adjustUserOrGuestBalance(sessionB, 1);
      io.to(sessionB.socketId).emit('token_reward', {
        amount: 1,
        balance: balB,
        message: '+1 Face Token earned for 1 min conversation! 🪙',
      });
    }
  }, 60000); // 60 seconds

  sessionA.minuteTimer = timer;
  sessionB.minuteTimer = timer;
}

export function initSignalingServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      const guestToken = socket.handshake.auth?.guestToken || socket.handshake.query?.guestToken;

      if (token) {
        try {
          const payload = jwt.verify(token as string, config.jwt.secret) as any;
          (socket as any).userId = payload.userId;
          (socket as any).isGuest = false;
          return next();
        } catch {
          // Token invalid, fallback to guest
        }
      }

      if (guestToken) {
        const guest = await validateGuestSession(guestToken as string);
        if (guest) {
          (socket as any).guestSessionId = guest.id;
          (socket as any).guestToken = guest.sessionToken;
          (socket as any).isGuest = true;
          (socket as any).gender = guest.gender;
          (socket as any).country = guest.country;
          return next();
        }
      }

      // Automatically provision a guest session so every connection has a valid token
      try {
        const autoGuest = await createGuestSession(
          (socket.handshake.address as string) || '127.0.0.1',
          (socket.handshake.headers['user-agent'] as string) || 'Browser'
        );
        (socket as any).guestSessionId = autoGuest.id;
        (socket as any).guestToken = autoGuest.sessionToken;
        (socket as any).isGuest = true;
        (socket as any).country = autoGuest.country;
        (socket as any).gender = autoGuest.gender;
      } catch {
        (socket as any).isGuest = true;
      }

      next();
    } catch (err) {
      next(err as any);
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    const guestSessionId = (socket as any).guestSessionId;
    const guestToken = (socket as any).guestToken;
    const isGuest = (socket as any).isGuest;
    const gender = (socket as any).gender;
    const country = (socket as any).country;

    const session: ClientSession = {
      socketId: socket.id,
      userId,
      guestSessionId,
      guestToken,
      isGuest,
      gender,
      country: country || 'Global',
      preference: 'anyone',
    };

    activeSockets.set(socket.id, session);
    logger.info('Socket connected', { socketId: socket.id, userId, isGuest });

    // Send assigned guestToken if created on handshake
    if (guestToken) {
      socket.emit('assigned_guest_token', { guestToken });
    }

    // Broadcast initial token balance immediately upon connection
    getUserOrGuestBalance(session).then((balance) => {
      socket.emit('token_balance', { balance });
    });

    // Periodically check 15-minute server guest session limit
    let guestCheckTimer: NodeJS.Timeout | null = null;
    if (isGuest && (socket as any).guestToken) {
      guestCheckTimer = setInterval(async () => {
        try {
          const status = await getGuestTimeRemaining((socket as any).guestToken);
          if (status.isExpired) {
            socket.emit('guest_expired', {
              message: `Guest time limit of ${config.business.guestFreeMinutes} minutes reached. Please create an account to continue.`,
            });
            handleEndCall(socket, 'guest_expired');
            if (guestCheckTimer) clearInterval(guestCheckTimer);
          } else if (status.shouldShowWarning) {
            socket.emit('guest_warning', {
              secondsRemaining: status.secondsRemaining,
              message: '2 minutes left before account sign-in is required.',
            });
          }
        } catch (e) {
          logger.error('Guest timer check error', e);
        }
      }, 20000); // Check every 20s
    }

    // Update snapshot / profile photo anytime
    socket.on('update_photo', (data: { photo?: string }) => {
      if (data?.photo) {
        session.photo = data.photo;
        logger.info('User updated snapshot photo', { socketId: socket.id });
        const peerId = session.matchedPeerSocketId;
        if (peerId && peerId !== 'simulated_stranger_bot') {
          io.to(peerId).emit('partner_photo_updated', { photo: data.photo });
        }
      }
    });

    // Join matchmaking queue with attached photo
    socket.on('join_queue', async (data: { preference?: 'anyone' | 'female' | 'male'; photo?: string }) => {
      session.preference = data?.preference || 'anyone';
      if (data?.photo) {
        session.photo = data.photo;
      }

      // TEST MODE AUTO-REFILL: If balance <= 0, automatically refill +10 tokens
      let currentBalance = await getUserOrGuestBalance(session);
      if (currentBalance <= 0) {
        currentBalance = await adjustUserOrGuestBalance(session, 10);
        socket.emit('token_reward', {
          amount: 10,
          balance: currentBalance,
          message: '🧪 Test Mode Auto-Refill: +10 Free Tokens Added!',
        });
      }

      // Check FaceChat Preference Pass if preference is selected
      if (session.preference !== 'anyone' && session.userId) {
        const hasActivePass = await preferenceService.isPreferenceActive(session.userId);
        if (!hasActivePass) {
          socket.emit('error_message', {
            message: 'Active FaceChat Preference Pass required to prioritize gender matching.',
          });
          session.preference = 'anyone';
        }
      }

      findAndConnectMatch(socket, session, io);
    });

    // User accepts photo in match preview (Tick ✓)
    socket.on('accept_match', () => {
      session.acceptedMatch = true;
      const peerId = session.matchedPeerSocketId;
      if (!peerId) return;

      if (peerId === 'simulated_stranger_bot') {
        // Simulated stranger accepts immediately
        socket.emit('call_start', {
          conversationId: session.activeConversationId,
          isInitiator: true,
        });
        return;
      }

      const peer = activeSockets.get(peerId);
      if (peer) {
        if (peer.acceptedMatch) {
          // Both accepted! Start live call on both ends
          socket.emit('call_start', {
            conversationId: session.activeConversationId,
            isInitiator: true,
          });
          io.to(peer.socketId).emit('call_start', {
            conversationId: session.activeConversationId,
            isInitiator: false,
          });

          // Start 1-min recurring reward ticker
          startMinuteRewardTicker(session, peer, io);
        } else {
          // Partner hasn't ticked yet
          socket.emit('waiting_partner_accept');
          io.to(peer.socketId).emit('partner_accepted');
        }
      }
    });

    // User rejects photo in match preview (Cross ✕) -> -2 Face Tokens penalty and skip
    socket.on('reject_match', async () => {
      let newBalance = await adjustUserOrGuestBalance(session, -2);
      socket.emit('token_penalty', {
        amount: 2,
        balance: newBalance,
        message: '-2 Face Tokens (Skipped person)',
      });

      const peerId = session.matchedPeerSocketId;
      await handleEndCall(socket, 'user_rejected');

      if (peerId && peerId !== 'simulated_stranger_bot') {
        const peer = activeSockets.get(peerId);
        if (peer) {
          io.to(peerId).emit('peer_disconnected', { reason: 'Partner skipped this match' });
        }
      }

      // If tokens hit 0 or below, auto-refill +10 in test mode so user can keep testing!
      if (newBalance <= 0) {
        newBalance = await adjustUserOrGuestBalance(session, 10);
        socket.emit('token_reward', {
          amount: 10,
          balance: newBalance,
          message: '🧪 Test Mode Auto-Refill: +10 Free Tokens Added!',
        });
      }

      findAndConnectMatch(socket, session, io);
    });

    // Simulate stranger (instant preview mode)
    socket.on('simulate_stranger', async (data?: { photo?: string }) => {
      if (data?.photo) session.photo = data.photo;
      let currentBal = await getUserOrGuestBalance(session);
      if (currentBal <= 0) {
        currentBal = await adjustUserOrGuestBalance(session, 10);
        socket.emit('token_reward', {
          amount: 10,
          balance: currentBal,
          message: '🧪 Test Mode Auto-Refill: +10 Free Tokens Added!',
        });
      }

      await handleEndCall(socket, 'new_search');
      const sampleCountries = ['United States', 'United Kingdom', 'Japan', 'France', 'Brazil', 'Germany', 'Canada', 'Australia'];
      const randomCountry = sampleCountries[Math.floor(Math.random() * sampleCountries.length)];
      const samplePhotos = [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
      ];
      const botPhoto = samplePhotos[Math.floor(Math.random() * samplePhotos.length)];
      const simGuestId = `guest_sim_${uuidv4().substring(0, 8)}`;
      const conv = await createConversation(
        session.userId || null,
        null,
        session.guestSessionId || null,
        simGuestId,
        session.preference
      );

      session.activeConversationId = conv.id;
      session.matchedPeerSocketId = 'simulated_stranger_bot';
      session.acceptedMatch = false;
      removeFromQueue(session.socketId);

      socket.emit('match_preview', {
        conversationId: conv.id,
        isInitiator: true,
        partnerCountry: randomCountry,
        partnerPhoto: botPhoto,
        partnerName: 'Stranger',
        isSimulated: true,
      });

      const botSession: ClientSession = {
        socketId: 'simulated_stranger_bot',
        isGuest: true,
        preference: 'anyone',
      };
      startMinuteRewardTicker(session, botSession, io);

      setTimeout(() => {
        if (session.activeConversationId === conv.id) {
          socket.emit('chat_message', {
            text: `Hey! Greeting from ${randomCountry}! How are you doing today?`,
            sender: 'peer',
            timestamp: Date.now(),
          });
        }
      }, 2500);
    });

    // WebRTC Signaling
    socket.on('offer', (data: { sdp: any }) => {
      if (session.matchedPeerSocketId === 'simulated_stranger_bot') {
        if (session.activeConversationId) {
          startConversation(session.activeConversationId);
        }
      } else if (session.matchedPeerSocketId) {
        io.to(session.matchedPeerSocketId).emit('offer', { sdp: data.sdp });
      }
    });

    socket.on('answer', (data: { sdp: any }) => {
      if (session.matchedPeerSocketId && session.matchedPeerSocketId !== 'simulated_stranger_bot') {
        io.to(session.matchedPeerSocketId).emit('answer', { sdp: data.sdp });
        if (session.activeConversationId) {
          startConversation(session.activeConversationId);
        }
      }
    });

    socket.on('ice_candidate', (data: { candidate: any }) => {
      if (session.matchedPeerSocketId && session.matchedPeerSocketId !== 'simulated_stranger_bot') {
        io.to(session.matchedPeerSocketId).emit('ice_candidate', { candidate: data.candidate });
      }
    });

    // Next person (user-initiated skip) -> Deduct 2 Face Tokens
    socket.on('next', async () => {
      const newBalance = await adjustUserOrGuestBalance(session, -2);
      socket.emit('token_penalty', {
        amount: 2,
        balance: newBalance,
        message: '-2 Face Tokens (Skip penalty)',
      });

      await handleEndCall(socket, 'user_skipped');

      if (newBalance <= 0) {
        socket.emit('zero_coins', {
          message: 'You have 0 Face Tokens! Refill tokens to continue meeting strangers.',
          balance: 0,
        });
        return;
      }

      findAndConnectMatch(socket, session, io);
    });

    // End call (user-initiated end)
    socket.on('end_call', async () => {
      await handleEndCall(socket, 'user_ended');
      removeFromQueue(session.socketId);
    });

    // Leave queue
    socket.on('leave_queue', () => {
      removeFromQueue(session.socketId);
      socket.emit('queue_left');
    });

    // Text chat message
    socket.on('chat_message', (data: { text: string }) => {
      if (session.matchedPeerSocketId === 'simulated_stranger_bot') {
        const responses = [
          'That is awesome! Nice to meet you on FaceChat!',
          'Haha totally agree with you!',
          'Where in the world are you connecting from?',
          'Such a cool app, matchmaking is so quick!',
          'Love the vibes here!',
        ];
        const reply = responses[Math.floor(Math.random() * responses.length)];
        setTimeout(() => {
          if (session.activeConversationId) {
            socket.emit('chat_message', {
              text: reply,
              sender: 'peer',
              timestamp: Date.now(),
            });
          }
        }, 1200);
      } else if (session.matchedPeerSocketId && data.text) {
        io.to(session.matchedPeerSocketId).emit('chat_message', {
          text: data.text,
          sender: 'peer',
          timestamp: Date.now(),
        });
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      if (guestCheckTimer) clearInterval(guestCheckTimer);
      if (session.minuteTimer) clearInterval(session.minuteTimer);
      removeFromQueue(socket.id);
      await handleEndCall(socket, 'disconnected');
      activeSockets.delete(socket.id);
      logger.info('Socket disconnected', { socketId: socket.id });
    });
  });

  return io;
}

function removeFromQueue(socketId: string) {
  const idx = waitingQueue.findIndex((s) => s.socketId === socketId);
  if (idx !== -1) {
    waitingQueue.splice(idx, 1);
  }
}

async function handleEndCall(socket: Socket, reason: string) {
  const session = activeSockets.get(socket.id);
  if (!session) return;

  // Clean up minute reward ticker
  if (session.minuteTimer) {
    clearInterval(session.minuteTimer);
    session.minuteTimer = undefined;
  }

  const peerId = session.matchedPeerSocketId;
  const convId = session.activeConversationId;

  if (convId) {
    await endConversation(convId, session.userId || session.guestSessionId || 'unknown', reason);
  }

  session.matchedPeerSocketId = undefined;
  session.activeConversationId = undefined;
  session.acceptedMatch = false;

  if (peerId) {
    const peerSession = activeSockets.get(peerId);
    if (peerSession) {
      if (peerSession.minuteTimer) {
        clearInterval(peerSession.minuteTimer);
        peerSession.minuteTimer = undefined;
      }
      peerSession.matchedPeerSocketId = undefined;
      peerSession.activeConversationId = undefined;
      peerSession.acceptedMatch = false;
    }
    socket.to(peerId).emit('peer_disconnected', { reason, conversationId: convId });
  }

  socket.emit('call_ended', { reason, conversationId: convId });
}

async function findAndConnectMatch(socket: Socket, session: ClientSession, io: SocketIOServer) {
  socket.emit('searching', { message: 'Finding someone somewhere in the world...' });

  const validQueue = waitingQueue.filter((s) => s.socketId !== socket.id && activeSockets.has(s.socketId));

  let matchedIdx = -1;

  for (let i = 0; i < validQueue.length; i++) {
    const candidate = validQueue[i];

    // Check blocks
    const userA = session.userId || session.guestSessionId || '';
    const userB = candidate.userId || candidate.guestSessionId || '';
    if (userA && userB) {
      const blocked = await isBlocked(userA, userB);
      if (blocked) continue;
    }

    matchedIdx = i;
    break;
  }

  if (matchedIdx !== -1) {
    const peer = validQueue[matchedIdx];
    removeFromQueue(peer.socketId);
    removeFromQueue(session.socketId);

    // Link peers
    session.matchedPeerSocketId = peer.socketId;
    peer.matchedPeerSocketId = session.socketId;
    session.acceptedMatch = false;
    peer.acceptedMatch = false;

    // Create conversation in DB
    const conv = await createConversation(
      session.userId || null,
      peer.userId || null,
      session.guestSessionId || null,
      peer.guestSessionId || null,
      session.preference
    );

    session.activeConversationId = conv.id;
    peer.activeConversationId = conv.id;

    // Emit match_preview with photo to both peers
    socket.emit('match_preview', {
      conversationId: conv.id,
      isInitiator: true,
      partnerCountry: peer.country || 'Global',
      partnerGender: peer.gender || 'prefer_not_to_say',
      partnerPhoto: peer.photo || null,
      partnerName: peer.userId ? 'FaceChat Member' : 'Stranger',
    });

    io.to(peer.socketId).emit('match_preview', {
      conversationId: conv.id,
      isInitiator: false,
      partnerCountry: session.country || 'Global',
      partnerGender: session.gender || 'prefer_not_to_say',
      partnerPhoto: session.photo || null,
      partnerName: session.userId ? 'FaceChat Member' : 'Stranger',
    });

    logEvent('match_created', { conversationId: conv.id, peerA: socket.id, peerB: peer.socketId });
  } else {
    // Add to waiting queue
    if (!waitingQueue.some((s) => s.socketId === session.socketId)) {
      waitingQueue.push(session);
    }
  }
}
