import { db } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CreateChannelInput, UpdateChannelInput } from '../validators/channel.schema.js';

export async function getChannels(serverId: string, userId: string) {
  const member = await db('server_members')
    .where({ server_id: serverId, user_id: userId })
    .first();

  if (!member) throw new AppError(403, 'Not a member of this server');

  return db('channels').where('server_id', serverId).orderBy('position', 'asc');
}

export async function createChannel(serverId: string, userId: string, input: CreateChannelInput) {
  const member = await db('server_members')
    .where({ server_id: serverId, user_id: userId })
    .first();

  if (!member || !['owner', 'admin'].includes(member.role)) {
    throw new AppError(403, 'Insufficient permissions');
  }

  const maxPos = await db('channels')
    .where('server_id', serverId)
    .max('position as max')
    .first();

  const [channel] = await db('channels')
    .insert({
      server_id: serverId,
      name: input.name,
      type: input.type,
      position: (maxPos?.max ?? -1) + 1,
    })
    .returning('*');

  return channel;
}

export async function updateChannel(
  channelId: string,
  serverId: string,
  userId: string,
  input: UpdateChannelInput,
) {
  const member = await db('server_members')
    .where({ server_id: serverId, user_id: userId })
    .first();

  if (!member || !['owner', 'admin'].includes(member.role)) {
    throw new AppError(403, 'Insufficient permissions');
  }

  const [channel] = await db('channels')
    .where({ id: channelId, server_id: serverId })
    .update({ ...input, updated_at: db.fn.now() })
    .returning('*');

  if (!channel) throw new AppError(404, 'Channel not found');
  return channel;
}

export async function deleteChannel(channelId: string, serverId: string, userId: string) {
  const member = await db('server_members')
    .where({ server_id: serverId, user_id: userId })
    .first();

  if (!member || !['owner', 'admin'].includes(member.role)) {
    throw new AppError(403, 'Insufficient permissions');
  }

  const deleted = await db('channels')
    .where({ id: channelId, server_id: serverId })
    .del();

  if (!deleted) throw new AppError(404, 'Channel not found');
}
