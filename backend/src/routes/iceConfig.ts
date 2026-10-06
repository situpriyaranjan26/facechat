import { Router } from 'express';
import { config } from '../config';

const router = Router();

router.get('/', (req, res) => {
  const iceServers = [
    { urls: config.turn.stunServer },
  ];

  if (config.turn.username && config.turn.password) {
    iceServers.push({
      urls: config.turn.server,
      username: config.turn.username,
      credential: config.turn.password,
    } as any);
  }

  res.json({ success: true, data: { iceServers } });
});

export default router;
