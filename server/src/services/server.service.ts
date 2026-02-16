import crypto from 'crypto';
import { db } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CreateServerInput, UpdateServerInput } from '../validators/server.schema.js';

function generateInviteCode(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8);
}

export async function createServer(userId: string, input: CreateServerInput) {
  const invite_code = generateInviteCode();

  const [server] = await db('servers')
    .insert({ name: input.name, owner_id: userId, invite_code })
    .returning('*');

  // Add owner as a member
  await db('server_members').insert({
    user_id: userId,
    server_id: server.id,
    role: 'owner',
  });

  // Create default text channel
  await db('channels').insert({
    server_id: server.id,
    name: 'general',
    type: 'text',
    position: 0,
  });

  return server;
}

export async function getUserServers(userId: string) {
  return db('servers')
    .join('server_members', 'servers.id', 'server_members.server_id')
    .where('server_members.user_id', userId)
    .select('servers.*', 'server_members.role');
}

export async function getServer(serverId: string, userId: string) {
  const member = await db('server_members')
    .where({ server_id: serverId, user_id: userId })
    .first();

  if (!member) throw new AppError(403, 'Not a member of this server');

  const server = await db('servers').where('id', serverId).first();
  if (!server) throw new AppError(404, 'Server not found');

  const members = await db('server_members')
    .join('users', 'server_members.user_id', 'users.id')
    .where('server_members.server_id', serverId)
    .select(
      'server_members.*',
      'users.username',
      'users.display_name',
      'users.avatar_url',
      'users.status',
    );

  const channels = await db('channels')
    .where('server_id', serverId)
    .orderBy('position', 'asc');

  return { ...server, members, channels };
}

export async function updateServer(serverId: string, userId: string, input: UpdateServerInput) {
  const server = await db('servers').where('id', serverId).first();
  if (!server) throw new AppError(404, 'Server not found');
  if (server.owner_id !== userId) throw new AppError(403, 'Only the owner can update this server');

  const [updated] = await db('servers')
    .where('id', serverId)
    .update({ ...input, updated_at: db.fn.now() })
    .returning('*');

  return updated;
}

export async function deleteServer(serverId: string, userId: string) {
  const server = await db('servers').where('id', serverId).first();
  if (!server) throw new AppError(404, 'Server not found');
  if (server.owner_id !== userId) throw new AppError(403, 'Only the owner can delete this server');

  await db('servers').where('id', serverId).del();
}

export async function joinServer(userId: string, inviteCode: string) {
  const server = await db('servers').where('invite_code', inviteCode).first();
  if (!server) throw new AppError(404, 'Invalid invite code');

  const existing = await db('server_members')
    .where({ user_id: userId, server_id: server.id })
    .first();

  if (existing) throw new AppError(409, 'Already a member of this server');

  await db('server_members').insert({
    user_id: userId,
    server_id: server.id,
    role: 'member',
  });

  return server;
}

export async function regenerateInvite(serverId: string, userId: string) {
  const member = await db('server_members')
    .where({ server_id: serverId, user_id: userId })
    .first();

  if (!member || !['owner', 'admin'].includes(member.role)) {
    throw new AppError(403, 'Insufficient permissions');
  }

  const invite_code = generateInviteCode();
  const [updated] = await db('servers')
    .where('id', serverId)
    .update({ invite_code })
    .returning('*');

  return updated;
}
