import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger, logEvent } from '../utils/logger';
import { createConversation, startConversation, endConversation } from '../modules/conversations/conversationService';
import { isBlocked } from '../modules/moderation/blockService';
import { validateGuestSession, getGuestTimeRemaining } from '../modules/security/guestService';
import { preferenceService } from '../modules/subscriptions/preferenceService';
import { getBalance } from '../modules/wallet/walletService';
import { ratingService } from '../modules/ratings/ratingService';
import { v4 as uuidv4 } from 'uuid';

interface ClientSession {
  socketId: string;
  userId?: string;
  guestSessionId?: string;
  isGuest: boolean;
  preference: 'anyone' | 'female' | 'male';
  gender?: string;
  country?: string;
  matchedPeerSocketId?: string;
  activeConversationId?: string;
}

const activeSockets = new Map<string, ClientSession>();
const waitingQueue: ClientSession[] = [];

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
          // Token invalid, try guest
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

      // Allow anonymous connection with guest flag
      (socket as any).isGuest = true;
      next();
    } catch (err) {
      next(err as any);
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    const guestSessionId = (socket as any).guestSessionId;
    const isGuest = (socket as any).isGuest;
    const gender = (socket as any).gender;
    const country = (socket as any).country;

    const session: ClientSession = {
      socketId: socket.id,
      userId,
      guestSessionId,
      isGuest,
      gender,
      country: country || 'Global',
      preference: 'anyone',
    };

    activeSockets.set(socket.id, session);
    logger.info('Socket connected', { socketId: socket.id, userId, isGuest });

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

    // Join matchmaking queue
    socket.on('join_queue', async (data: { preference?: 'anyone' | 'female' | 'male' }) => {
      session.preference = data?.preference || 'anyone';

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

      // Check Face Tokens balance for authenticated users
      if (session.userId) {
        const bal = await getBalance(session.userId);
        if (bal <= 0) {
          socket.emit('zero_coins', { message: 'You need Face Tokens to start talking!' });
          return;
        }
      }

      findAndConnectMatch(socket, session, io);
    });

    // Simulate stranger (dev/testing mode)
    socket.on('simulate_stranger', async () => {
      await handleEndCall(socket, 'new_search');
      const countries = ['United States', 'United Kingdom', 'Japan', 'France', 'Brazil', 'Germany', 'Canada', 'Australia'];
      const randomCountry = countries[Math.floor(Math.random() * countries.length)];
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
      removeFromQueue(session.socketId);

      socket.emit('matched', {
        conversationId: conv.id,
        isInitiator: true,
        partnerCountry: randomCountry,
        isSimulated: true,
      });

      setTimeout(() => {
        if (session.activeConversationId === conv.id) {
          socket.emit('chat_message', {
            text: `Hey! Greeting from ${randomCountry}! How are you doing today?`,
            sender: 'peer',
            timestamp: Date.now(),
          });
        }
      }, 2000);
    });

    // WebRTC Signaling
    socket.on('offer', (data: { sdp: any }) => {
      if (session.matchedPeerSocketId === 'simulated_stranger_bot') {
        if (session.activeConversationId) {
          startConversation(session.activeConversationId);
        }
        // Respond with loopback answer
        socket.emit('answer', { sdp: data.sdp });
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

    // Next person (user-initiated skip)
    socket.on('next', async () => {
      await handleEndCall(socket, 'user_skipped');
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
          'Love the Gen-Z vibes here!',
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

  const peerId = session.matchedPeerSocketId;
  const convId = session.activeConversationId;

  if (convId) {
    await endConversation(convId, session.userId || session.guestSessionId || 'unknown', reason);
  }

  session.matchedPeerSocketId = undefined;
  session.activeConversationId = undefined;

  if (peerId) {
    const peerSession = activeSockets.get(peerId);
    if (peerSession) {
      peerSession.matchedPeerSocketId = undefined;
      peerSession.activeConversationId = undefined;
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

    // WebRTC initiation
    socket.emit('matched', {
      conversationId: conv.id,
      isInitiator: true,
      partnerCountry: peer.country || 'Global',
      partnerGender: peer.gender || 'prefer_not_to_say',
    });

    io.to(peer.socketId).emit('matched', {
      conversationId: conv.id,
      isInitiator: false,
      partnerCountry: session.country || 'Global',
      partnerGender: session.gender || 'prefer_not_to_say',
    });

    logEvent('match_created', { conversationId: conv.id, peerA: socket.id, peerB: peer.socketId });
  } else {
    // Add to waiting queue
    if (!waitingQueue.some((s) => s.socketId === session.socketId)) {
      waitingQueue.push(session);
    }
  }
}
