import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createServerSchema, joinServerSchema, updateServerSchema } from '../validators/server.schema.js';
import * as serverController from '../controllers/server.controller.js';

export const serverRoutes = Router();

serverRoutes.use(requireAuth);

serverRoutes.get('/', serverController.getServers);
serverRoutes.post('/', validate(createServerSchema), serverController.createServer);
serverRoutes.post('/join', validate(joinServerSchema), serverController.joinServer);
serverRoutes.get('/:id', serverController.getServer);
serverRoutes.patch('/:id', validate(updateServerSchema), serverController.updateServer);
serverRoutes.delete('/:id', serverController.deleteServer);
serverRoutes.post('/:id/invite', serverController.regenerateInvite);
