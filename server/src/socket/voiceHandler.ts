import type { Server, Socket } from 'socket.io';
import { db } from '../config/database.js';

// Track voice channel participants: channelId -> Set of { userId, username, socketId }
const voiceRooms = new Map<string, Map<string, { userId: string; username: string; socketId: string }>>();

async function verifyChannelMembership(userId: string, channelId: string): Promise<boolean> {
  const channel = await db('channels').where('id', channelId).select('server_id').first();
  if (!channel) return false;
  const member = await db('server_members')
    .where({ server_id: channel.server_id, user_id: userId })
    .first();
  return !!member;
}

export function voiceHandler(io: Server, socket: Socket) {
  socket.on('voice:join', async (channelId: string) => {
    if (typeof channelId !== 'string' || !channelId) return;

    const isMember = await verifyChannelMembership(socket.data.userId, channelId);
    if (!isMember) {
      socket.emit('error', { message: 'Not a member of this server' });
      return;
    }

    // Leave any existing voice channel
    leaveCurrentVoiceChannel(io, socket);

    // Join new voice channel
    if (!voiceRooms.has(channelId)) {
      voiceRooms.set(channelId, new Map());
    }

    const room = voiceRooms.get(channelId)!;
    room.set(socket.data.userId, {
      userId: socket.data.userId,
      username: socket.data.username,
      socketId: socket.id,
    });

    socket.data.voiceChannelId = channelId;
    socket.join(`voice:${channelId}`);

    // Tell the new user about existing participants
    const participants = Array.from(room.values()).map(({ userId, username }) => ({ userId, username }));
    socket.emit('voice:participants', { channelId, participants });

    // Tell existing participants about the new user
    socket.to(`voice:${channelId}`).emit('voice:user-joined', {
      userId: socket.data.userId,
      username: socket.data.username,
      channelId,
    });
  });

  socket.on('voice:leave', () => {
    leaveCurrentVoiceChannel(io, socket);
  });

  // WebRTC signaling relay
  socket.on('voice:offer', (data: { to: string; offer: RTCSessionDescriptionInit }) => {
    if (!data || typeof data.to !== 'string') return;
    const channelId = socket.data.voiceChannelId;
    if (!channelId) return;

    const room = voiceRooms.get(channelId);
    if (!room) return;

    const target = room.get(data.to);
    if (target) {
      io.to(target.socketId).emit('voice:offer', {
        from: socket.data.userId,
        offer: data.offer,
      });
    }
  });

  socket.on('voice:answer', (data: { to: string; answer: RTCSessionDescriptionInit }) => {
    if (!data || typeof data.to !== 'string') return;
    const channelId = socket.data.voiceChannelId;
    if (!channelId) return;

    const room = voiceRooms.get(channelId);
    if (!room) return;

    const target = room.get(data.to);
    if (target) {
      io.to(target.socketId).emit('voice:answer', {
        from: socket.data.userId,
        answer: data.answer,
      });
    }
  });

  socket.on('voice:ice-candidate', (data: { to: string; candidate: RTCIceCandidateInit }) => {
    if (!data || typeof data.to !== 'string') return;
    const channelId = socket.data.voiceChannelId;
    if (!channelId) return;

    const room = voiceRooms.get(channelId);
    if (!room) return;

    const target = room.get(data.to);
    if (target) {
      io.to(target.socketId).emit('voice:ice-candidate', {
        from: socket.data.userId,
        candidate: data.candidate,
      });
    }
  });

  socket.on('disconnect', () => {
    leaveCurrentVoiceChannel(io, socket);
  });
}

function leaveCurrentVoiceChannel(io: Server, socket: Socket) {
  const channelId = socket.data.voiceChannelId;
  if (!channelId) return;

  const room = voiceRooms.get(channelId);
  if (room) {
    room.delete(socket.data.userId);
    if (room.size === 0) {
      voiceRooms.delete(channelId);
    }
  }

  socket.leave(`voice:${channelId}`);
  socket.data.voiceChannelId = undefined;

  io.to(`voice:${channelId}`).emit('voice:user-left', {
    userId: socket.data.userId,
    channelId,
  });
}

export function getVoiceParticipants(channelId: string) {
  const room = voiceRooms.get(channelId);
  if (!room) return [];
  return Array.from(room.values()).map(({ userId, username }) => ({ userId, username }));
}
