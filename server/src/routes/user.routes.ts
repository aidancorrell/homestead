import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as userController from '../controllers/user.controller.js';

export const userRoutes = Router();

userRoutes.use(requireAuth);

userRoutes.get('/me', userController.getProfile);
userRoutes.patch('/me', userController.updateProfile);
