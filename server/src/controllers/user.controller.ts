import type { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service.js';

export async function getOnlineUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const userIds = await userService.getOnlineUsers();
    res.json(userIds);
  } catch (err) { next(err); }
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getProfile(req.user!.userId);
    res.json(user);
  } catch (err) { next(err); }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.updateProfile(req.user!.userId, req.body);
    res.json(user);
  } catch (err) { next(err); }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    await userService.changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword);
    res.json({ message: 'Password changed successfully' });
  } catch (err) { next(err); }
}
