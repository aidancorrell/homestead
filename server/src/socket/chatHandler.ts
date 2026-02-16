import type { Server, Socket } from 'socket.io';
import { createMessage } from '../services/message.service.js';

export function chatHandler(io: Server, socket: Socket) {
  socket.on('channel:join', (channelId: string) => {
    socket.join(`channel:${channelId}`);
  });

  socket.on('channel:leave', (channelId: string) => {
    socket.leave(`channel:${channelId}`);
  });

  socket.on('message:send', async (data: { channelId: string; content: string }) => {
    try {
      const message = await createMessage(data.channelId, socket.data.userId, data.content);
      io.to(`channel:${data.channelId}`).emit('message:new', message);
    } catch (err) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('message:typing', (channelId: string) => {
    socket.to(`channel:${channelId}`).emit('message:typing', {
      channelId,
      userId: socket.data.userId,
      username: socket.data.username,
    });
  });
}
