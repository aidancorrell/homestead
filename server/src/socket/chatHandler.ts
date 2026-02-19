import type { Server, Socket } from 'socket.io';
import { createMessage } from '../services/message.service.js';
import { db } from '../config/database.js';

const MAX_MESSAGE_LENGTH = 4000;
const MESSAGE_RATE_LIMIT = 5; // messages per window
const MESSAGE_RATE_WINDOW = 5000; // 5 seconds
const TYPING_RATE_WINDOW = 3000; // 3 seconds

// Per-socket rate tracking
const messageTimestamps = new WeakMap<Socket, number[]>();
const lastTyping = new WeakMap<Socket, number>();

function isRateLimited(socket: Socket): boolean {
  const now = Date.now();
  let timestamps = messageTimestamps.get(socket);
  if (!timestamps) {
    timestamps = [];
    messageTimestamps.set(socket, timestamps);
  }
  // Remove old timestamps outside window
  while (timestamps.length > 0 && timestamps[0] < now - MESSAGE_RATE_WINDOW) {
    timestamps.shift();
  }
  if (timestamps.length >= MESSAGE_RATE_LIMIT) return true;
  timestamps.push(now);
  return false;
}

async function verifyChannelMembership(userId: string, channelId: string): Promise<boolean> {
  const channel = await db('channels').where('id', channelId).select('server_id').first();
  if (!channel) return false;
  const member = await db('server_members')
    .where({ server_id: channel.server_id, user_id: userId })
    .first();
  return !!member;
}

export function chatHandler(io: Server, socket: Socket) {
  socket.on('channel:join', async (channelId: string) => {
    if (typeof channelId !== 'string' || !channelId) return;
    const isMember = await verifyChannelMembership(socket.data.userId, channelId);
    if (!isMember) {
      socket.emit('error', { message: 'Not a member of this server' });
      return;
    }
    socket.join(`channel:${channelId}`);
  });

  socket.on('channel:leave', (channelId: string) => {
    if (typeof channelId !== 'string' || !channelId) return;
    socket.leave(`channel:${channelId}`);
  });

  socket.on('message:send', async (data: { channelId: string; content: string }) => {
    if (!data || typeof data.channelId !== 'string' || typeof data.content !== 'string') return;
    if (data.content.length > MAX_MESSAGE_LENGTH) {
      socket.emit('error', { message: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` });
      return;
    }
    if (isRateLimited(socket)) {
      socket.emit('error', { message: 'Sending messages too fast' });
      return;
    }

    try {
      const isMember = await verifyChannelMembership(socket.data.userId, data.channelId);
      if (!isMember) {
        socket.emit('error', { message: 'Not a member of this server' });
        return;
      }
      const message = await createMessage(data.channelId, socket.data.userId, data.content);
      io.to(`channel:${data.channelId}`).emit('message:new', message);
    } catch (err) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('message:typing', (channelId: string) => {
    if (typeof channelId !== 'string' || !channelId) return;
    // Throttle typing events
    const now = Date.now();
    const last = lastTyping.get(socket) || 0;
    if (now - last < TYPING_RATE_WINDOW) return;
    lastTyping.set(socket, now);

    socket.to(`channel:${channelId}`).emit('message:typing', {
      channelId,
      userId: socket.data.userId,
      username: socket.data.username,
    });
  });
}
