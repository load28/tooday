import type { User } from '@tooday/shared';

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
}

export interface UserStore {
  create(input: CreateUserInput): Promise<User>;
  verifyCredentials(input: { email: string; password: string }): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: number;
}

export interface SessionStore {
  create(userId: string): Promise<Session>;
  get(token: string): Promise<Session | null>;
  revoke(token: string): Promise<void>;
}
