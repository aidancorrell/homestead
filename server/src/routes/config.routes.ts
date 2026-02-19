import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const configRoutes = Router();

configRoutes.use(requireAuth);

configRoutes.get('/ice', (req, res) => {
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  if (env.TURN_URL) {
    iceServers.push({
      urls: env.TURN_URL,
      username: env.TURN_USER,
      credential: env.TURN_PASSWORD,
    });
  }

  res.json({ iceServers });
});
