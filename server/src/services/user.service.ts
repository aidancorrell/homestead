import { db } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getProfile(userId: string) {
  const user = await db('users')
    .where('id', userId)
    .select('id', 'username', 'display_name', 'email', 'avatar_url', 'status', 'created_at')
    .first();

  if (!user) throw new AppError(404, 'User not found');
  return user;
}

export async function updateProfile(userId: string, data: { display_name?: string; avatar_url?: string }) {
  const [user] = await db('users')
    .where('id', userId)
    .update({ ...data, updated_at: db.fn.now() })
    .returning(['id', 'username', 'display_name', 'email', 'avatar_url', 'status', 'created_at']);

  if (!user) throw new AppError(404, 'User not found');
  return user;
}
