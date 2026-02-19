import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import type { RegisterInput, LoginInput } from '../validators/auth.schema.js';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const JWT_ALGORITHM = 'HS256' as const;

// Precomputed hash for timing-safe login (used when user not found)
const DUMMY_HASH = '$2b$12$000000000000000000000uGmRxD/VK5ECFxGDH3DvDLJoEAJ98cXi';

export interface TokenPayload {
  userId: string;
  username: string;
}

interface RefreshPayload extends TokenPayload {
  tokenVersion: number;
}

function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: JWT_ALGORITHM });
}

function signRefreshToken(payload: RefreshPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY, algorithm: JWT_ALGORITHM });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: [JWT_ALGORITHM] }) as TokenPayload;
}

function verifyRefreshTokenJwt(token: string): RefreshPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: [JWT_ALGORITHM] }) as RefreshPayload;
}

export async function register(input: RegisterInput) {
  // Verify invite code
  const server = await db('servers').where('invite_code', input.invite_code).first();
  if (!server) throw new AppError(400, 'Invalid invite code');

  // Check username uniqueness
  const existing = await db('users').where('username', input.username).first();
  if (existing) throw new AppError(409, 'Username already taken');

  const password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const [user] = await db('users')
    .insert({
      username: input.username,
      display_name: input.display_name || input.username,
      password_hash,
    })
    .returning(['id', 'username', 'display_name', 'avatar_url', 'status', 'created_at']);

  // Auto-join the server from the invite code
  await db('server_members').insert({
    user_id: user.id,
    server_id: server.id,
    role: 'member',
  });

  const tokenVersion = 0;
  const payload: TokenPayload = { userId: user.id, username: user.username };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ ...payload, tokenVersion });

  return { user, accessToken, refreshToken };
}

export async function login(input: LoginInput) {
  const user = await db('users').where('username', input.username).first();

  // Timing-safe: always run bcrypt compare even if user not found
  const hashToCompare = user ? user.password_hash : DUMMY_HASH;
  const valid = await bcrypt.compare(input.password, hashToCompare);

  if (!user || !valid) throw new AppError(401, 'Invalid username or password');

  const payload: TokenPayload = { userId: user.id, username: user.username };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ ...payload, tokenVersion: user.token_version || 0 });

  const { password_hash: _, token_version: _tv, ...safeUser } = user;

  return { user: safeUser, accessToken, refreshToken };
}

export async function refresh(refreshTokenStr: string) {
  const payload = verifyRefreshTokenJwt(refreshTokenStr);

  const user = await db('users')
    .where('id', payload.userId)
    .select('id', 'username', 'display_name', 'avatar_url', 'status', 'created_at', 'token_version')
    .first();

  if (!user) throw new AppError(401, 'User not found');

  // Check token version — if it doesn't match, the token has been revoked
  if ((payload.tokenVersion ?? -1) !== (user.token_version || 0)) {
    throw new AppError(401, 'Token has been revoked');
  }

  const tokenPayload: TokenPayload = { userId: user.id, username: user.username };
  const accessToken = signAccessToken(tokenPayload);
  const newRefreshToken = signRefreshToken({ ...tokenPayload, tokenVersion: user.token_version || 0 });

  const { token_version: _, ...safeUser } = user;

  return { user: safeUser, accessToken, refreshToken: newRefreshToken };
}

export async function logout(userId: string) {
  // Increment token_version to invalidate all existing refresh tokens
  await db('users').where('id', userId).increment('token_version', 1);
}
