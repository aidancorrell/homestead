import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../services/auth.service.js';
import { chatHandler } from './chatHandler.js';
import { voiceHandler } from './voiceHandler.js';
import { presenceHandler } from './presenceHandler.js';

let io: Server;

export function getIO(): Server {
  return io;
}

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  });

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token provided'));

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.data.username} (${socket.data.userId})`);

    chatHandler(io, socket);
    voiceHandler(io, socket);
    presenceHandler(io, socket);
  });
}
