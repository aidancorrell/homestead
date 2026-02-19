import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { registerSchema, loginSchema } from '../validators/auth.schema.js';
import * as authController from '../controllers/auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validate(registerSchema), authController.register);
authRoutes.post('/login', authLimiter, validate(loginSchema), authController.login);
authRoutes.post('/refresh', authLimiter, authController.refresh);
authRoutes.post('/logout', authController.logout);
