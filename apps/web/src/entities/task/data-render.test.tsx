// @vitest-environment jsdom
import { useLiveSuspenseQuery } from '@tanstack/react-db';
import { useAtom } from '@tanstack/react-store';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTaskData, type TaskHydration } from '@/entities/task/data';
import { TodayStateProvider, useTodayState } from '@/features/today/state';

const initial: TaskHydration = {
  userId: 'u1',
  cursor: 1,
  tasks: [
    {
      id: 't1',
      projectId: null,
      title: '서버에서 온 제목',
      date: '2026-09-16',
      startAt: '09:00',
      durationMin: 30,
      status: 'todo',
      version: 1,
    },
  ],
  projects: [],
  scopes: [{ kind: 'task', id: 't1' }],
};

afterEach(cleanup);

describe('페이지 상태와 초기 렌더링', () => {
  it('SSR 데이터가 첫 HTML과 브라우저 hydration에 동일하게 표시된다', async () => {
    const unexpected = vi.fn(async (): Promise<never> => {
      throw new Error('초기 렌더에서 네트워크를 호출하면 안 된다');
    });
    const data = createTaskData(
      'u1',
      {
        snapshot: unexpected,
        changes: unexpected,
        create: unexpected,
        update: unexpected,
        remove: unexpected,
        createProject: unexpected,
        subscribe: () => () => {},
        invalidateSummaries: () => {},
      },
      { realtime: false, initial },
    );
    function View() {
      const { data: rows } = useLiveSuspenseQuery(data.taskView({ kind: 'task', id: 't1' }));
      return <p>{rows[0]?.title}</p>;
    }
    const ui = (
      <Suspense fallback={<p>loading</p>}>
        <View />
      </Suspense>
    );
    const html = renderToString(ui);
    expect(html).toContain('서버에서 온 제목');
    expect(html).not.toContain('loading');
    const container = document.createElement('div');
    container.innerHTML = html;
    const onRecoverableError = vi.fn();
    const root = hydrateRoot(container, ui, { onRecoverableError });
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toBe('서버에서 온 제목');
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(unexpected).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    await data.dispose();
  });

  it('같은 페이지를 두 번 열어도 Atom을 공유하지 않고 다시 마운트하면 초기화된다', () => {
    function Selection({ name }: { name: string }) {
      const { activeOffsetAtom } = useTodayState();
      const [value, setValue] = useAtom(activeOffsetAtom);
      return (
        <button type="button" onClick={() => setValue(value + 1)}>
          {name}:{value}
        </button>
      );
    }
    const tree = (
      <>
        <TodayStateProvider>
          <Selection name="A" />
        </TodayStateProvider>
        <TodayStateProvider>
          <Selection name="B" />
        </TodayStateProvider>
      </>
    );
    const view = render(tree);
    fireEvent.click(screen.getByText('A:0'));
    expect(screen.getByText('A:1')).toBeDefined();
    expect(screen.getByText('B:0')).toBeDefined();
    view.unmount();
    render(tree);
    expect(screen.getByText('A:0')).toBeDefined();
  });
});
