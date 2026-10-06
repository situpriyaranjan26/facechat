import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// -----------------------------------------------------------------------
// Generic request validator factory
// -----------------------------------------------------------------------
type Location = 'body' | 'query' | 'params';

export function validate(schema: Joi.ObjectSchema, location: Location = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const target = req[location];
    const { error, value } = schema.validate(target, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      res.status(400).json({ error: 'Validation failed', details });
      return;
    }

    // Replace the request location with the sanitized value
    (req as any)[location] = value;
    next();
  };
}

// -----------------------------------------------------------------------
// Reusable field schemas
// -----------------------------------------------------------------------
const email = Joi.string().email().max(255).lowercase().trim();
const password = Joi.string().min(8).max(128);
const uuid = Joi.string().uuid({ version: 'uuidv4' });

// -----------------------------------------------------------------------
// Auth schemas
// -----------------------------------------------------------------------
export const registerSchema = Joi.object({
  email: email.required(),
  password: password.required(),
  displayName: Joi.string().min(2).max(100).trim().optional(),
  gender: Joi.string().valid('male', 'female', 'prefer_not_to_say').optional(),
});

export const loginSchema = Joi.object({
  email: email.required(),
  password: Joi.string().required(),
});

export const forgotPasswordSchema = Joi.object({
  email: email.required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: password.required(),
});

// -----------------------------------------------------------------------
// User schemas
// -----------------------------------------------------------------------
export const updateProfileSchema = Joi.object({
  displayName: Joi.string().min(2).max(100).trim().optional(),
  avatarUrl: Joi.string().uri().max(500).allow(null, '').optional(),
  country: Joi.string().length(2).uppercase().optional(),
  languages: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  interests: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  gender: Joi.string().valid('male', 'female', 'prefer_not_to_say').optional(),
});

export const updatePreferencesSchema = Joi.object({
  preference: Joi.string().valid('anyone', 'female', 'male').required(),
});

// -----------------------------------------------------------------------
// Conversation schemas
// -----------------------------------------------------------------------
export const endConversationSchema = Joi.object({
  reason: Joi.string().max(100).optional(),
});

// -----------------------------------------------------------------------
// Report schemas
// -----------------------------------------------------------------------
export const createReportSchema = Joi.object({
  reportedUserId: uuid.optional(),
  reportedGuestSessionId: uuid.optional(),
  conversationId: uuid.optional(),
  reason: Joi.string()
    .valid('harassment', 'nudity', 'spam', 'hate_speech', 'minor', 'other')
    .required(),
  description: Joi.string().max(1000).allow('', null).optional(),
  metadata: Joi.object().optional(),
});

// -----------------------------------------------------------------------
// Coin purchase schemas
// -----------------------------------------------------------------------
export const coinPurchaseSchema = Joi.object({
  bundleType: Joi.string().valid('small', 'medium', 'large', 'mega', 'coins_1000').optional(),
  bundleId: Joi.string().optional(),
});

// -----------------------------------------------------------------------
// Guest session schemas
// -----------------------------------------------------------------------
export const guestSessionSchema = Joi.object({
  fingerprint: Joi.string().max(500).optional(),
});

export const guestConvertSchema = Joi.object({
  sessionToken: Joi.string().required(),
});

// -----------------------------------------------------------------------
// Analytics event schema
// -----------------------------------------------------------------------
export const analyticsEventSchema = Joi.object({
  eventName: Joi.string().max(100).required(),
  anonymousId: Joi.string().max(255).optional(),
  properties: Joi.object().optional(),
});

// -----------------------------------------------------------------------
// Admin schemas
// -----------------------------------------------------------------------
export const banUserSchema = Joi.object({
  reason: Joi.string().max(500).required(),
  expiresAt: Joi.date().iso().allow(null).optional(),
});

export const updateReportSchema = Joi.object({
  status: Joi.string().valid('reviewed', 'actioned', 'dismissed').required(),
  actionTaken: Joi.string().max(1000).allow('', null).optional(),
});
