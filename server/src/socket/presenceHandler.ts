import type { Server, Socket } from 'socket.io';
import { db } from '../config/database.js';

export function presenceHandler(io: Server, socket: Socket) {
  // Set user online
  db('users').where('id', socket.data.userId).update({ status: 'online' }).then(() => {
    io.emit('user:online', socket.data.userId);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.data.username}`);

    // Check if user has other active connections
    const sockets = io.sockets.sockets;
    let hasOtherConnection = false;
    for (const [, s] of sockets) {
      if (s.data.userId === socket.data.userId && s.id !== socket.id) {
        hasOtherConnection = true;
        break;
      }
    }

    if (!hasOtherConnection) {
      db('users').where('id', socket.data.userId).update({ status: 'offline' }).then(() => {
        io.emit('user:offline', socket.data.userId);
      });
    }
  });
}
