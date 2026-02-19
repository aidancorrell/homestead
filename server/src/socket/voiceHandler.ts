import type { Server, Socket } from 'socket.io';

// Track voice channel participants: channelId -> Set of { userId, username, socketId }
const voiceRooms = new Map<string, Map<string, { userId: string; username: string; socketId: string }>>();

export function voiceHandler(io: Server, socket: Socket) {
  socket.on('voice:join', (channelId: string) => {
    console.log(`[VOICE] ${socket.data.username} joining channel ${channelId.slice(0, 8)}`);

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
    console.log(`[VOICE] Sending participants to ${socket.data.username}:`, participants.map(p => p.username));
    socket.emit('voice:participants', { channelId, participants });

    // Tell existing participants about the new user
    socket.to(`voice:${channelId}`).emit('voice:user-joined', {
      userId: socket.data.userId,
      username: socket.data.username,
      channelId,
    });
  });

  socket.on('voice:leave', () => {
    console.log(`[VOICE] ${socket.data.username} leaving voice channel`);
    leaveCurrentVoiceChannel(io, socket);
  });

  // WebRTC signaling relay
  socket.on('voice:offer', (data: { to: string; offer: RTCSessionDescriptionInit }) => {
    const channelId = socket.data.voiceChannelId;
    if (!channelId) {
      console.log(`[VOICE] offer from ${socket.data.username} but not in a channel`);
      return;
    }

    const room = voiceRooms.get(channelId);
    if (!room) return;

    const target = room.get(data.to);
    if (target) {
      console.log(`[VOICE] Relaying offer: ${socket.data.username} -> ${target.username}`);
      io.to(target.socketId).emit('voice:offer', {
        from: socket.data.userId,
        offer: data.offer,
      });
    } else {
      console.log(`[VOICE] offer target ${data.to.slice(0, 8)} not found in room`);
    }
  });

  socket.on('voice:answer', (data: { to: string; answer: RTCSessionDescriptionInit }) => {
    const channelId = socket.data.voiceChannelId;
    if (!channelId) return;

    const room = voiceRooms.get(channelId);
    if (!room) return;

    const target = room.get(data.to);
    if (target) {
      console.log(`[VOICE] Relaying answer: ${socket.data.username} -> ${target.username}`);
      io.to(target.socketId).emit('voice:answer', {
        from: socket.data.userId,
        answer: data.answer,
      });
    } else {
      console.log(`[VOICE] answer target ${data.to.slice(0, 8)} not found in room`);
    }
  });

  socket.on('voice:ice-candidate', (data: { to: string; candidate: RTCIceCandidateInit }) => {
    const channelId = socket.data.voiceChannelId;
    if (!channelId) return;

    const room = voiceRooms.get(channelId);
    if (!room) return;

    const target = room.get(data.to);
    if (target) {
      const c = data.candidate as { candidate?: string };
      console.log(`[VOICE] ICE ${socket.data.username} -> ${target.username}: ${c.candidate?.slice(0, 120) || '?'}`);
      io.to(target.socketId).emit('voice:ice-candidate', {
        from: socket.data.userId,
        candidate: data.candidate,
      });
    }
  });

  // Temporary debug: client reports WebRTC state changes
  socket.on('voice:debug', (msg: string) => {
    console.log(`[VOICE-DEBUG] ${socket.data.username}: ${msg}`);
  });

  socket.on('disconnect', (reason) => {
    if (socket.data.voiceChannelId) {
      console.log(`[VOICE] ${socket.data.username} disconnected while in voice channel (reason: ${reason})`);
    }
    leaveCurrentVoiceChannel(io, socket);
  });
}

function leaveCurrentVoiceChannel(io: Server, socket: Socket) {
  const channelId = socket.data.voiceChannelId;
  if (!channelId) return;

  console.log(`[VOICE] Removing ${socket.data.username} from channel ${channelId.slice(0, 8)}`);

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

// Export for use in other modules if needed
export function getVoiceParticipants(channelId: string) {
  const room = voiceRooms.get(channelId);
  if (!room) return [];
  return Array.from(room.values()).map(({ userId, username }) => ({ userId, username }));
}
