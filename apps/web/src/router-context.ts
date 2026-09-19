import type { AuthServerCache } from '@/entities/auth/server-cache';
import type { TaskCacheSession } from '@/entities/task/cache-session';

export interface RouterAppContext {
  auth: AuthServerCache;
  taskCacheSession: TaskCacheSession;
  endSession(): Promise<void>;
}
