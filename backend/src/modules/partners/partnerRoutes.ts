import { Router, Response } from 'express';
import { partnerService } from './partnerService';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.use(requireAuth as any);

// POST /api/partners/book – request a booking with another user
router.post('/book', async (req: any, res: Response) => {
  try {
    const { partnerId } = req.body;
    if (!partnerId) return res.status(400).json({ error: 'partnerId required' });
    const booking = await partnerService.requestBooking(req.user!.id, partnerId);
    res.json({ success: true, booking });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/partners/respond – accept or decline a booking
router.post('/respond', async (req: any, res: Response) => {
  try {
    const { bookingId, status } = req.body;
    if (!bookingId || (status !== 'accepted' && status !== 'declined')) {
      return res.status(400).json({ error: 'bookingId and status (accepted|declined) required' });
    }
    const updated = await partnerService.updateBookingStatus(bookingId, req.user!.id, status);
    res.json({ success: true, booking: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/partners/my-bookings – list user's bookings
router.get('/my-bookings', async (req: any, res: Response) => {
  try {
    const bookings = await partnerService.listUserBookings(req.user!.id);
    res.json({ success: true, ...bookings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
