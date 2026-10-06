import { User, GuestSession } from './index';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      guestSession?: GuestSession;
    }
  }
}
