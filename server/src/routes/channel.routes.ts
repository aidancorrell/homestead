import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createChannelSchema, updateChannelSchema } from '../validators/channel.schema.js';
import * as channelController from '../controllers/channel.controller.js';

export const channelRoutes = Router();

channelRoutes.use(requireAuth);

channelRoutes.get('/:serverId/channels', channelController.getChannels);
channelRoutes.post('/:serverId/channels', validate(createChannelSchema), channelController.createChannel);
channelRoutes.patch('/:serverId/channels/:id', validate(updateChannelSchema), channelController.updateChannel);
channelRoutes.delete('/:serverId/channels/:id', channelController.deleteChannel);
