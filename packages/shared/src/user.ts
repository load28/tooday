import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

export const meResponseSchema = z.object({
  user: userSchema,
});

export type User = z.infer<typeof userSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
