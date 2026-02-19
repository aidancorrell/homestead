import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';

function getRefreshCookieOptions(req: Request) {
  const isHttps = req.secure || req.get('X-Forwarded-Proto') === 'https';
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: isHttps,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  };
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);
    res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions(req));
    res.status(201).json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);
    res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions(req));
    res.json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ error: 'No refresh token' });
      return;
    }
    const result = await authService.refresh(token);
    res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions(req));
    res.json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    // Invalidate refresh tokens server-side if we have a valid access token
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const payload = authService.verifyAccessToken(header.slice(7));
        await authService.logout(payload.userId);
      } catch {
        // Token invalid/expired — still clear cookie
      }
    }
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}
