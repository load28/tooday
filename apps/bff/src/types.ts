import type { User } from '@tooday/shared';

export interface AuthVariables {
  user: User;
  sessionToken: string;
}

export type AppEnv = {
  Variables: AuthVariables;
};
