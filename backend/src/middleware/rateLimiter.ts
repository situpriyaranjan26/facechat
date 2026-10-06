import rateLimit from 'express-rate-limit';
import { config } from '../config';

function makeLimiter(options: {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: options.message || 'Too many requests, please try again later.' },
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
  });
}

// -----------------------------------------------------------------------
// Pre-configured limiters
// -----------------------------------------------------------------------

export const loginLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: config.rateLimiting.maxLoginAttempts,
  keyPrefix: 'rl:login:',
  message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  skipSuccessfulRequests: true,
});

export const registerLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyPrefix: 'rl:register:',
  message: 'Too many accounts created from this IP. Please try again later.',
});

export const passwordResetLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyPrefix: 'rl:pw-reset:',
  message: 'Too many password reset requests. Please wait an hour.',
});

export const reportLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: config.rateLimiting.maxReportsPerHour,
  keyPrefix: 'rl:report:',
  message: 'Report limit reached for this hour. Please try again later.',
});

export const matchmakingLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: config.rateLimiting.maxMatchesPerHour,
  keyPrefix: 'rl:match:',
  message: 'Matchmaking rate limit reached. Please wait before searching again.',
});

export const generalApiLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: 'rl:general:',
  message: 'Too many requests. Please slow down.',
});

export const paymentLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyPrefix: 'rl:payment:',
  message: 'Payment request limit reached. Please wait.',
});
export const authLimiter = loginLimiter;
