// @vitest-environment jsdom
import { useAtom } from '@tanstack/react-store';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { NewTaskSheetStoreProvider, useNewTaskSheetStore } from '@/features/tasks/new-task-sheet-store';

afterEach(cleanup);

function SheetSelection({ name }: { name: string }) {
  const { openSheetAtom } = useNewTaskSheetStore();
  const [openSheet, setOpenSheet] = useAtom(openSheetAtom);
  return (
    <button type="button" onClick={() => setOpenSheet('schedule')}>
      {name}:{openSheet ?? 'closed'}
    </button>
  );
}

it('새 태스크 시트 Atom을 Provider 인스턴스별로 격리하고 재마운트할 때 초기화한다', () => {
  const tree = (
    <>
      <NewTaskSheetStoreProvider>
        <SheetSelection name="A" />
      </NewTaskSheetStoreProvider>
      <NewTaskSheetStoreProvider>
        <SheetSelection name="B" />
      </NewTaskSheetStoreProvider>
    </>
  );
  const view = render(tree);
  fireEvent.click(screen.getByText('A:closed'));
  expect(screen.getByText('A:schedule')).toBeDefined();
  expect(screen.getByText('B:closed')).toBeDefined();

  view.unmount();
  render(tree);
  expect(screen.getByText('A:closed')).toBeDefined();
});
