import sanitizeHtml from 'sanitize-html';
import { db } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

const SANITIZE_OPTIONS = { allowedTags: [], allowedAttributes: {} };

export async function getMessages(
  channelId: string,
  userId: string,
  options: { before?: string; limit?: number },
) {
  // Verify the user has access to this channel's server
  const channel = await db('channels').where('id', channelId).first();
  if (!channel) throw new AppError(404, 'Channel not found');

  const member = await db('server_members')
    .where({ server_id: channel.server_id, user_id: userId })
    .first();
  if (!member) throw new AppError(403, 'Not a member of this server');

  const limit = Math.min(options.limit || 50, 100);

  let query = db('messages')
    .join('users', 'messages.author_id', 'users.id')
    .where('messages.channel_id', channelId)
    .select(
      'messages.*',
      'users.username as author_username',
      'users.display_name as author_display_name',
      'users.avatar_url as author_avatar_url',
    )
    .orderBy('messages.created_at', 'desc')
    .limit(limit + 1);

  if (options.before) {
    const beforeMsg = await db('messages').where('id', options.before).first();
    if (beforeMsg) {
      query = query.where('messages.created_at', '<', beforeMsg.created_at);
    }
  }

  const rows = await query;
  const hasMore = rows.length > limit;
  const messages = rows.slice(0, limit).reverse().map((row: Record<string, unknown>) => ({
    id: row.id,
    channel_id: row.channel_id,
    author_id: row.author_id,
    content: row.content,
    edited_at: row.edited_at,
    created_at: row.created_at,
    author: {
      id: row.author_id,
      username: row.author_username,
      display_name: row.author_display_name,
      avatar_url: row.author_avatar_url,
    },
  }));

  return { messages, hasMore };
}

export async function createMessage(channelId: string, authorId: string, content: string) {
  const sanitized = sanitizeHtml(content, SANITIZE_OPTIONS);
  if (!sanitized.trim()) throw new AppError(400, 'Message cannot be empty');

  const [message] = await db('messages')
    .insert({ channel_id: channelId, author_id: authorId, content: sanitized })
    .returning('*');

  const author = await db('users')
    .where('id', authorId)
    .select('id', 'username', 'display_name', 'avatar_url')
    .first();

  return { ...message, author };
}
