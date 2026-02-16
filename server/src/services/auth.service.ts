import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import type { RegisterInput, LoginInput } from '../validators/auth.schema.js';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  username: string;
}

function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}

export async function register(input: RegisterInput) {
  const existing = await db('users')
    .where('email', input.email)
    .orWhere('username', input.username)
    .first();

  if (existing) {
    if (existing.email === input.email) throw new AppError(409, 'Email already in use');
    throw new AppError(409, 'Username already taken');
  }

  const password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const [user] = await db('users')
    .insert({
      username: input.username,
      display_name: input.display_name || input.username,
      email: input.email,
      password_hash,
    })
    .returning(['id', 'username', 'display_name', 'email', 'avatar_url', 'status', 'created_at']);

  const payload: TokenPayload = { userId: user.id, username: user.username };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return { user, accessToken, refreshToken };
}

export async function login(input: LoginInput) {
  const user = await db('users').where('email', input.email).first();
  if (!user) throw new AppError(401, 'Invalid email or password');

  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) throw new AppError(401, 'Invalid email or password');

  const payload: TokenPayload = { userId: user.id, username: user.username };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const { password_hash: _, ...safeUser } = user;

  return { user: safeUser, accessToken, refreshToken };
}

export async function refresh(refreshTokenStr: string) {
  const payload = verifyRefreshToken(refreshTokenStr);

  const user = await db('users')
    .where('id', payload.userId)
    .select('id', 'username', 'display_name', 'email', 'avatar_url', 'status', 'created_at')
    .first();

  if (!user) throw new AppError(401, 'User not found');

  const tokenPayload: TokenPayload = { userId: user.id, username: user.username };
  const accessToken = signAccessToken(tokenPayload);
  const newRefreshToken = signRefreshToken(tokenPayload);

  return { user, accessToken, refreshToken: newRefreshToken };
}
