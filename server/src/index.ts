import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { db } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/auth.routes.js';
import { serverRoutes } from './routes/server.routes.js';
import { channelRoutes } from './routes/channel.routes.js';
import { messageRoutes } from './routes/message.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { initSocket } from './socket/index.js';

const app = express();
const httpServer = createServer(app);

app.use(helmet({ contentSecurityPolicy: env.NODE_ENV === 'production' }));
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/servers', channelRoutes);
app.use('/api/channels', messageRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);

initSocket(httpServer);

async function start() {
  try {
    await db.raw('SELECT 1');
    console.log('Database connected');

    // Run migrations
    await db.migrate.latest({
      directory: new URL('./db/migrations', import.meta.url).pathname,
    });
    console.log('Migrations complete');

    httpServer.listen(env.PORT, '0.0.0.0', () => {
      console.log(`Server running on 0.0.0.0:${env.PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
