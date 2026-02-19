import { z } from 'zod';

export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(64).optional(),
  avatar_url: z.string().url().max(512).nullable().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const editMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});
