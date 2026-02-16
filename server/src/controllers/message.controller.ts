import type { Request, Response, NextFunction } from 'express';
import * as messageService from '../services/message.service.js';

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
