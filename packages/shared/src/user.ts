import * as v from 'valibot';

export const userSchema = v.object({
  id: v.string(),
  email: v.string(),
  name: v.string(),
});

export type User = v.InferOutput<typeof userSchema>;
