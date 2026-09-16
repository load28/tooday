import type { TrpcContext } from '@/app/trpc';
import type { TaskSession } from '@/entities/task/session';

export interface RouterAppContext extends TrpcContext {
  taskSession: TaskSession;
  endSession(): Promise<void>;
}
