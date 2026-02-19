import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { editMessageSchema } from '../validators/user.schema.js';
import * as messageController from '../controllers/message.controller.js';

export const messageRoutes = Router();

messageRoutes.use(requireAuth);

messageRoutes.get('/:channelId/messages', messageController.getMessages);
messageRoutes.patch('/:channelId/messages/:id', validate(editMessageSchema), messageController.editMessage);
messageRoutes.delete('/:channelId/messages/:id', messageController.deleteMessage);
