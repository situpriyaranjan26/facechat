import { Router, Request, Response } from 'express';
import { paymentService } from './paymentService';
import { requireAuth } from '../../middleware/auth';
import { paymentLimiter } from '../../middleware/rateLimiter';
import { TokenBundleType } from '../../types';
import { logger } from '../../utils/logger';

const router = Router();

// GET /api/payments/products – public
router.get('/products', async (_req: Request, res: Response) => {
  try {
    const products = await paymentService.getProducts();
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/token-purchase or /coin-purchase – authenticated
const handleTokenPurchase = async (req: any, res: Response) => {
  try {
    const raw = req.body.bundleType || req.body.bundleId;
    let bundleType: TokenBundleType = 'standard';
    if (raw === 'popular' || raw === 'mega' || raw === 'standard') {
      bundleType = raw;
    }
    const result = await paymentService.createTokenPurchaseSession(
      req.user!.id,
      bundleType
    );
    res.json({ success: true, data: result, ...result });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

router.post('/token-purchase', requireAuth as any, paymentLimiter, handleTokenPurchase);
router.post('/coin-purchase', requireAuth as any, paymentLimiter, handleTokenPurchase);

// POST /api/payments/preference-pass or /female-pass – authenticated
const handlePreferencePass = async (req: any, res: Response) => {
  try {
    const result = await paymentService.createPreferencePassSession(req.user!.id);
    res.json({ success: true, data: result, ...result });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

router.post('/preference-pass', requireAuth as any, paymentLimiter, handlePreferencePass);
router.post('/female-pass', requireAuth as any, paymentLimiter, handlePreferencePass);

// POST /api/payments/razorpay/create-order – Dummy Razorpay order endpoint
router.post('/razorpay/create-order', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id || 'guest_user';
    const { itemType, itemId, amount, currency } = req.body;
    const order = await paymentService.createRazorpayOrder(
      userId,
      itemType || 'token_bundle',
      itemId || 'standard',
      amount || 99,
      currency || 'INR'
    );
    res.json({ success: true, ...order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/razorpay/verify-payment – Dummy Razorpay verify endpoint
router.post('/razorpay/verify-payment', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id || (req.body.userId || 'guest_user');
    const { orderId, paymentId, itemType, itemId, amount } = req.body;
    const result = await paymentService.verifyRazorpayPayment(
      userId,
      orderId,
      paymentId || `pay_test_${Date.now()}`,
      itemType || 'token_bundle',
      itemId || 'standard',
      amount || 99
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/webhook – raw body, NO auth (Stripe calls this)
router.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  try {
    await paymentService.handleWebhook(req.body as Buffer, signature);
    res.json({ received: true });
  } catch (err: any) {
    logger.error('Webhook handling error', { err: err.message });
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

export default router;
