import type { Request, Response, NextFunction } from 'express';
import * as messageService from '../services/message.service.js';
import { getIO } from '../socket/index.js';

const p = (v: string | string[] | undefined) => v as string;

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await messageService.getMessages(p(req.params.channelId), req.user!.userId, {
      before: req.query.before as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });
    res.json(result);
  } catch (err) { next(err); }
}

export async function editMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const message = await messageService.editMessage(
      p(req.params.id),
      req.user!.userId,
      req.body.content,
    );
    getIO().to(`channel:${message.channel_id}`).emit('message:edit', message);
    res.json(message);
  } catch (err) { next(err); }
}

export async function deleteMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await messageService.deleteMessage(p(req.params.id), req.user!.userId);
    getIO().to(`channel:${result.channelId}`).emit('message:delete', { id: result.id, channelId: result.channelId });
    res.status(204).end();
  } catch (err) { next(err); }
}
