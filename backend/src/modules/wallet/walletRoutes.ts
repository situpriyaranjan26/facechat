import { Router, Response } from 'express';
import { walletService } from './walletService';
import { requireAuth } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../types';

const router = Router();

// All wallet routes require authentication
router.use(requireAuth as any);

// GET /api/wallet/balance
router.get('/balance', async (req: any, res: Response) => {
  try {
    const wallet = await walletService.getWallet(req.user!.id);
    res.json({
      balance: wallet.balance,
      totalEarned: wallet.totalEarned,
      totalSpent: wallet.totalSpent,
      totalPurchased: wallet.totalPurchased,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// GET /api/wallet/transactions
router.get('/transactions', async (req: any, res: Response) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);
    const offset = parseInt((req.query.offset as string) || '0', 10);
    const { transactions, total } = await walletService.getTransactionHistory(req.user!.id, limit, offset);
    res.json({ transactions, total, limit, offset });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// GET /api/wallet/summary
router.get('/summary', async (req: any, res: Response) => {
  try {
    const wallet = await walletService.getWallet(req.user!.id);
    res.json({
      balance: wallet.balance,
      totalEarned: wallet.totalEarned,
      totalSpent: wallet.totalSpent,
      totalPurchased: wallet.totalPurchased,
      isLowBalance: wallet.balance < 100,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

export default router;
