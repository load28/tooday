import * as v from 'valibot';

export const userSchema = v.object({
  id: v.string(),
  email: v.string(),
  name: v.string(),
});

export const meResponseSchema = v.object({
  user: userSchema,
});

export type User = v.InferOutput<typeof userSchema>;
export type MeResponse = v.InferOutput<typeof meResponseSchema>;
