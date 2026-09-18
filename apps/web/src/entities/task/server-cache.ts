import {
  collectionOptions,
  DbClient,
  type LoadSubsetOptions,
  liveQueryCollectionOptions,
  type SyncConfig,
} from '@tanstack/react-db';
import {
  type Project,
  projectSchema,
  projectSummarySchema,
  type Task,
  type TaskChange,
  type TaskRangeResponse,
  type TaskScope,
  taskSchema,
  taskScopeSchema,
} from '@tooday/shared';
import * as v from 'valibot';
import { createTaskCommands } from '@/entities/task/commands';
import type { TaskTransport } from '@/entities/task/ports';
import { taskQuery } from '@/entities/task/queries';
import { matchesScope, scopeFromSubset, scopeKey } from '@/entities/task/scope';
import { createProjectSummaries } from '@/entities/task/summaries';

export const TASK_GC_MS = 5 * 60_000;

/** 서버 렌더의 원본 데이터만 전달한다. 액션·Store·연결은 직렬화하지 않는다. */
export const taskHydrationSchema = v.object({
  userId: v.string(),
  cursor: v.nullable(v.number()),
  tasks: v.array(taskSchema),
  projects: v.array(projectSchema),
  scopes: v.array(taskScopeSchema),
  summaries: v.optional(v.array(projectSummarySchema)),
});
export type TaskHydration = v.InferOutput<typeof taskHydrationSchema>;
type Sink<T extends object> = Parameters<SyncConfig<T, string>['sync']>[0];
type ScopeEntry = {
  scope: TaskScope;
  refs: number;
  loaded: boolean;
  pending?: Promise<void>;
  timer?: ReturnType<typeof setTimeout>;
};

export function createTaskServerCache(
  userId: string,
  transport: TaskTransport,
  options: { gcTime?: number; initial?: TaskHydration; realtime?: boolean } = {},
) {
  const gcTime = options.gcTime ?? TASK_GC_MS;
  const db = new DbClient();
  const abort = new AbortController();
  const summaries = createProjectSummaries(db, userId, transport, abort.signal, gcTime, options.initial?.summaries);
  const scopes = new Map<string, ScopeEntry>();
  const acquisitions = new WeakMap<LoadSubsetOptions, ScopeEntry>();
  const versions = new Map<string, number>();
  const taskKeys = new Set<string>();
  const projectKeys = new Set<string>();
  const projectSeqs = new Map<string, number>();
  let taskSink: Sink<Task> | undefined;
  let projectSink: Sink<Project> | undefined;
  let cursor = options.initial?.cursor ?? null;
  let projectSeed = options.initial?.cursor !== null ? options.initial?.projects : undefined;
  let taskSeed = options.initial?.tasks;
  let sourceCount = 0;
  let stopStream: (() => void) | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let pullPending = false;
  let pulling: Promise<void> | undefined;
  let reads: Promise<unknown> = Promise.resolve();
  let pendingActions = 0;

  const assertActive = () => {
    if (abort.signal.aborted) throw new DOMException('인증 세션이 종료되었습니다.', 'AbortError');
  };

  // 초기 범위와 델타 읽기를 직렬화해 늦은 초기 응답이 전역 커서를 건너뛰게 하지 않는다.
  function read<T>(operation: () => Promise<T>): Promise<T> {
    const next = reads.then(() => {
      assertActive();
      return operation();
    });
    reads = next.catch(() => {});
    return next;
  }

  async function applyTasks(rows: Task[], immediate = false): Promise<void> {
    if (!taskSink || rows.length === 0) return;
    const accepted = rows.filter((task) => task.version > (versions.get(task.id) ?? 0));
    if (accepted.length === 0) return;
    taskSink.begin({ immediate });
    for (const task of accepted) {
      taskSink.write({ type: taskKeys.has(task.id) ? 'update' : 'insert', value: task });
      versions.set(task.id, task.version);
      taskKeys.add(task.id);
    }
    await taskSink.commit();
  }

  async function applyProjects(rows: Project[], seq: number, immediate = false): Promise<void> {
    if (!projectSink || rows.length === 0) return;
    const accepted = rows.filter((project) => seq >= (projectSeqs.get(project.id) ?? -1));
    if (accepted.length === 0) return;
    projectSink.begin({ immediate });
    for (const project of accepted) {
      projectSink.write({ type: projectKeys.has(project.id) ? 'update' : 'insert', value: project });
      projectSeqs.set(project.id, seq);
      projectKeys.add(project.id);
    }
    await projectSink.commit();
  }

  async function removeTask(id: string, version: number, immediate = false): Promise<void> {
    if (!taskSink || version <= (versions.get(id) ?? 0)) return;
    versions.set(id, version); // tombstone도 기억해 늦은 스냅샷의 부활을 막는다.
    if (!taskKeys.delete(id)) return;
    taskSink.begin({ immediate });
    taskSink.write({ type: 'delete', key: id });
    await taskSink.commit();
  }

  function wanted(task: Task): boolean {
    return [...scopes.values()].some((entry) => matchesScope(task, entry.scope));
  }

  async function applyChange(change: TaskChange): Promise<void> {
    if (change.deleted) await removeTask(change.id, change.version);
    else if (taskKeys.has(change.id) || wanted(change)) {
      const { syncSeq: _seq, deleted: _deleted, ...task } = change;
      await applyTasks([task]);
    }
  }

  function connect() {
    if (options.realtime === false || abort.signal.aborted || sourceCount === 0 || cursor === null || stopStream) return;
    stopStream = transport.subscribe(() => {
      void pull().catch(scheduleRetry);
    });
    void pull().catch(scheduleRetry); // 초기 스냅샷과 SSE 연결 사이의 변경도 회수한다.
  }

  function scheduleRetry() {
    if (abort.signal.aborted || sourceCount === 0 || retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void pull().catch(scheduleRetry);
    }, 3000);
  }

  function stopIfIdle() {
    if (sourceCount > 0) return;
    stopStream?.();
    stopStream = undefined;
    clearTimeout(retryTimer);
    retryTimer = undefined;
  }

  function pull(): Promise<void> {
    if (abort.signal.aborted || cursor === null || sourceCount === 0) return Promise.resolve();
    pullPending = true;
    if (pulling) return pulling;
    pulling = read(async () => {
      do {
        pullPending = false;
        const delta = await transport.changes(cursor ?? 0, abort.signal);
        assertActive();
        for (const change of delta.tasks) await applyChange(change);
        for (const change of delta.projects) {
          if (change.deleted) {
            if (projectSink && change.syncSeq >= (projectSeqs.get(change.id) ?? -1)) {
              projectSeqs.set(change.id, change.syncSeq);
              if (projectKeys.delete(change.id)) {
                projectSink.begin();
                projectSink.write({ type: 'delete', key: change.id });
                await projectSink.commit();
              }
            }
          } else {
            const { syncSeq, deleted: _deleted, ...project } = change;
            await applyProjects([project], syncSeq);
          }
        }
        // 양쪽 컬렉션의 적용이 끝나기 전에는 커서를 전진시키지 않는다.
        cursor = delta.cursor;
        if (delta.tasks.length || delta.projects.length) summaries.invalidate();
      } while (pullPending && !abort.signal.aborted && sourceCount > 0);
    }).finally(() => {
      pulling = undefined;
    });
    return pulling;
  }

  async function installSnapshot(snapshot: TaskRangeResponse, scope: TaskScope) {
    assertActive();
    await applyTasks(snapshot.tasks);
    await applyProjects(snapshot.projects, snapshot.cursor);
    // 새 범위의 커서로 기존 범위의 미수신 변경을 건너뛰지 않는다.
    cursor ??= snapshot.cursor;
    const entry = scopes.get(scopeKey(scope));
    if (entry) entry.loaded = true;
    connect();
  }

  function entryFor(scope: TaskScope): ScopeEntry {
    const key = scopeKey(scope);
    let entry = scopes.get(key);
    if (!entry) {
      entry = { scope, refs: 0, loaded: false };
      scopes.set(key, entry);
    }
    return entry;
  }

  function prune() {
    if (!taskSink || pendingActions > 0) return;
    const unused = [...tasks.values()].filter((task) => !wanted(task));
    if (!unused.length) return;
    taskSink.begin();
    for (const task of unused) {
      if (!taskKeys.delete(task.id)) continue;
      // 범위 해제는 서버 삭제가 아니다. 재조회에서 같은 버전도 다시 들어올 수 있다.
      versions.delete(task.id);
      taskSink.write({ type: 'delete', key: task.id });
    }
    void Promise.resolve(taskSink.commit()).catch(() => {});
  }

  function retainCache(entry: ScopeEntry) {
    clearTimeout(entry.timer);
    if (entry.refs > 0 || abort.signal.aborted || scopes.get(scopeKey(entry.scope)) !== entry) return;
    entry.timer = setTimeout(() => {
      if (entry.refs > 0) return;
      scopes.delete(scopeKey(entry.scope));
      prune();
    }, gcTime);
  }

  function load(entry: ScopeEntry): Promise<void> {
    if (entry.loaded) return Promise.resolve();
    entry.pending ??= read(async () => {
      const owner = taskSink;
      const snapshot = await transport.snapshot(entry.scope, abort.signal);
      assertActive();
      if (taskSink !== owner || scopes.get(scopeKey(entry.scope)) !== entry) return;
      await installSnapshot(snapshot, entry.scope);
    }).finally(() => {
      entry.pending = undefined;
      retainCache(entry);
    });
    return entry.pending;
  }

  for (const scope of options.initial?.scopes ?? []) {
    const entry = entryFor(scope);
    entry.loaded = true;
    retainCache(entry);
  }

  const tasks = db.collection(
    collectionOptions({
      id: `tasks:${userId}`,
      schema: taskSchema,
      getKey: (task) => task.id,
      gcTime,
      syncMode: 'on-demand',
      sync: {
        sync(params) {
          taskSink = params;
          sourceCount++;
          if (taskSeed) {
            params.begin();
            for (const task of taskSeed) {
              params.write({ type: 'insert', value: task });
              taskKeys.add(task.id);
              versions.set(task.id, task.version);
            }
            params.commit();
            taskSeed = undefined;
          }
          params.markReady();
          connect();
          return {
            loadSubset(subset) {
              const entry = entryFor(scopeFromSubset(subset));
              acquisitions.set(subset, entry);
              entry.refs++;
              clearTimeout(entry.timer);
              return entry.loaded ? true : load(entry);
            },
            unloadSubset(subset) {
              const entry = acquisitions.get(subset);
              if (!entry) return;
              acquisitions.delete(subset);
              entry.refs--;
              retainCache(entry);
            },
            cleanup() {
              taskSink = undefined;
              sourceCount--;
              for (const entry of scopes.values()) clearTimeout(entry.timer);
              scopes.clear();
              versions.clear();
              taskKeys.clear();
              stopIfIdle();
            },
          };
        },
      },
    }),
  );

  const projects = db.collection(
    collectionOptions({
      id: `projects:${userId}`,
      schema: projectSchema,
      getKey: (project) => project.id,
      gcTime,
      sync: {
        sync(params) {
          projectSink = params;
          sourceCount++;
          if (projectSeed) {
            params.begin();
            for (const project of projectSeed) {
              params.write({ type: 'insert', value: project });
              projectKeys.add(project.id);
              projectSeqs.set(project.id, cursor ?? 0);
            }
            params.commit();
            projectSeed = undefined;
            params.markReady();
            connect();
          } else {
            void read(async () => {
              const snapshot = await transport.snapshot({ kind: 'projects' }, abort.signal);
              if (projectSink !== params) return;
              await installSnapshot(snapshot, { kind: 'projects' });
              params.markReady();
            }).catch((error: unknown) => {
              if (projectSink === params) params.markError(error);
            });
          }
          return () => {
            projectSink = undefined;
            sourceCount--;
            projectKeys.clear();
            projectSeqs.clear();
            stopIfIdle();
          };
        },
      },
    }),
  );

  // 원본뿐 아니라 파생 조회도 DbClient가 소유해야 SSR 종료·로그아웃 때
  // 파생 조회를 먼저 정리하고 원본을 정리할 수 있다.
  function taskView(scope: Exclude<TaskScope, { kind: 'projects' }>) {
    return db.collection(
      collectionOptions(`task-view:${userId}:${scopeKey(scope)}`, () =>
        liveQueryCollectionOptions({ id: `task-view:${userId}:${scopeKey(scope)}`, query: taskQuery({ tasks }, scope), gcTime }),
      ),
    );
  }
  function projectView() {
    return db.collection(
      collectionOptions(`project-view:${userId}`, () =>
        liveQueryCollectionOptions({ id: `project-view:${userId}`, query: (q) => q.from({ project: projects }), gcTime }),
      ),
    );
  }

  async function preload(scope: TaskScope) {
    assertActive();
    if (scope.kind === 'projects') {
      await projectView().preload();
      return;
    }
    await Promise.all([taskView(scope).preload(), projectView().preload()]);
  }

  const commands = createTaskCommands({
    db,
    tasks,
    projects,
    transport,
    signal: abort.signal,
    invalidateSummaries: summaries.invalidate,
    async retain() {
      assertActive();
      // 진행 중인 액션은 페이지 언마운트·컬렉션 GC와 독립적으로 완료한다.
      const a = tasks.subscribeChanges(() => {});
      const b = projects.subscribeChanges(() => {});
      pendingActions++;
      try {
        await projects.preload();
      } catch (error) {
        a.unsubscribe();
        b.unsubscribe();
        pendingActions--;
        throw error;
      }
      return () => {
        pendingActions--;
        a.unsubscribe();
        b.unsubscribe();
        prune();
      };
    },
    applyTask: (task) => applyTasks([task], true),
    removeTask: (id) => removeTask(id, Number.POSITIVE_INFINITY, true),
    // 서버가 ID를 발급하므로 createProject는 응답 후 원본에 추가한다.
    applyProject: (project) => applyProjects([project], cursor ?? 0, true),
  });

  return {
    userId,
    tasks,
    projects,
    commands,
    taskView,
    projectView,
    summaryView: summaries.view,
    preloadSummaries: summaries.preload,
    preload,
    pull,
    dehydrate(): TaskHydration {
      return {
        userId,
        cursor,
        summaries: summaries.dehydrate(),
        tasks: [...tasks.values()].map((task) => v.parse(taskSchema, task)),
        projects: [...projects.values()].map((project) => v.parse(projectSchema, project)),
        scopes: [...scopes.values()].filter((entry) => entry.loaded).map((entry) => entry.scope),
      };
    },
    async dispose() {
      abort.abort();
      stopStream?.();
      stopStream = undefined;
      clearTimeout(retryTimer);
      for (const entry of scopes.values()) clearTimeout(entry.timer);
      await db.cleanup();
      summaries.clear();
    },
  };
}

export type TaskServerCache = ReturnType<typeof createTaskServerCache>;
