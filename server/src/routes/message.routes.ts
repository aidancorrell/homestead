import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as messageController from '../controllers/message.controller.js';

export const messageRoutes = Router();

messageRoutes.use(requireAuth);

messageRoutes.get('/:channelId/messages', messageController.getMessages);
