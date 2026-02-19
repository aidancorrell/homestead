import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema, changePasswordSchema } from '../validators/user.schema.js';
import * as userController from '../controllers/user.controller.js';

export const userRoutes = Router();

userRoutes.use(requireAuth);

userRoutes.get('/online', userController.getOnlineUsers);
userRoutes.get('/me', userController.getProfile);
userRoutes.patch('/me', validate(updateProfileSchema), userController.updateProfile);
userRoutes.patch('/me/password', validate(changePasswordSchema), userController.changePassword);
