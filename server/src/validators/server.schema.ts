import { z } from 'zod';

export const createServerSchema = z.object({
  name: z.string().min(1).max(100),
});

export const joinServerSchema = z.object({
  invite_code: z.string().min(6).max(12),
});

export const updateServerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon_url: z.string().url().max(512).nullable().optional(),
});

export type CreateServerInput = z.infer<typeof createServerSchema>;
export type JoinServerInput = z.infer<typeof joinServerSchema>;
export type UpdateServerInput = z.infer<typeof updateServerSchema>;
