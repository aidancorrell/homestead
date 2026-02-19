import sanitizeHtml from 'sanitize-html';
import bcrypt from 'bcrypt';
import { db } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

const SANITIZE_OPTIONS = { allowedTags: [], allowedAttributes: {} };

export async function getProfile(userId: string) {
  const user = await db('users')
    .where('id', userId)
    .select('id', 'username', 'display_name', 'avatar_url', 'status', 'created_at')
    .first();

  if (!user) throw new AppError(404, 'User not found');
  return user;
}

export async function getOnlineUsers() {
  const users = await db('users')
    .where('status', 'online')
    .select('id');
  return users.map((u: { id: string }) => u.id);
}

export async function updateProfile(userId: string, data: { display_name?: string; avatar_url?: string | null }) {
  // Only allow explicit fields (Zod strips unknown fields, but be explicit here too)
  const update: Record<string, unknown> = { updated_at: db.fn.now() };
  if (data.display_name !== undefined) {
    update.display_name = sanitizeHtml(data.display_name, SANITIZE_OPTIONS);
  }
  if (data.avatar_url !== undefined) {
    update.avatar_url = data.avatar_url;
  }

  const [user] = await db('users')
    .where('id', userId)
    .update(update)
    .returning(['id', 'username', 'display_name', 'avatar_url', 'status', 'created_at']);

  if (!user) throw new AppError(404, 'User not found');
  return user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await db('users').where('id', userId).select('id', 'password_hash', 'token_version').first();
  if (!user) throw new AppError(404, 'User not found');

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new AppError(401, 'Current password is incorrect');

  const password_hash = await bcrypt.hash(newPassword, 12);
  await db('users').where('id', userId).update({
    password_hash,
    token_version: (user.token_version || 0) + 1,
    updated_at: db.fn.now(),
  });
}
