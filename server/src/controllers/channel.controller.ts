import type { Request, Response, NextFunction } from 'express';
import * as channelService from '../services/channel.service.js';

const p = (v: string | string[] | undefined) => v as string;

export async function getChannels(req: Request, res: Response, next: NextFunction) {
  try {
    const channels = await channelService.getChannels(p(req.params.serverId), req.user!.userId);
    res.json(channels);
  } catch (err) { next(err); }
}

export async function createChannel(req: Request, res: Response, next: NextFunction) {
  try {
    const channel = await channelService.createChannel(p(req.params.serverId), req.user!.userId, req.body);
    res.status(201).json(channel);
  } catch (err) { next(err); }
}

export async function updateChannel(req: Request, res: Response, next: NextFunction) {
  try {
    const channel = await channelService.updateChannel(
      p(req.params.id), p(req.params.serverId), req.user!.userId, req.body,
    );
    res.json(channel);
  } catch (err) { next(err); }
}

export async function deleteChannel(req: Request, res: Response, next: NextFunction) {
  try {
    await channelService.deleteChannel(p(req.params.id), p(req.params.serverId), req.user!.userId);
    res.status(204).send();
  } catch (err) { next(err); }
}
