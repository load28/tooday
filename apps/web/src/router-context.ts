import type { AuthData } from '@/entities/auth/data';
import type { TaskSession } from '@/entities/task/session';

export interface RouterAppContext {
  auth: AuthData;
  taskSession: TaskSession;
  endSession(): Promise<void>;
}
