import type { Request, Response, NextFunction } from 'express';
import * as serverService from '../services/server.service.js';

const p = (v: string | string[] | undefined) => v as string;

export async function createServer(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await serverService.createServer(req.user!.userId, req.body);
    res.status(201).json(server);
  } catch (err) { next(err); }
}

export async function getServers(req: Request, res: Response, next: NextFunction) {
  try {
    const servers = await serverService.getUserServers(req.user!.userId);
    res.json(servers);
  } catch (err) { next(err); }
}

export async function getServer(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await serverService.getServer(p(req.params.id), req.user!.userId);
    res.json(server);
  } catch (err) { next(err); }
}

export async function updateServer(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await serverService.updateServer(p(req.params.id), req.user!.userId, req.body);
    res.json(server);
  } catch (err) { next(err); }
}

export async function deleteServer(req: Request, res: Response, next: NextFunction) {
  try {
    await serverService.deleteServer(p(req.params.id), req.user!.userId);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function joinServer(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await serverService.joinServer(req.user!.userId, req.body.invite_code);
    res.json(server);
  } catch (err) { next(err); }
}

export async function regenerateInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await serverService.regenerateInvite(p(req.params.id), req.user!.userId);
    res.json({ invite_code: server.invite_code });
  } catch (err) { next(err); }
}
