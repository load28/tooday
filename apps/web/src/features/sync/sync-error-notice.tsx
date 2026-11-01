import * as stylex from '@stylexjs/stylex';
import { useTaskSyncError } from '@/entities/task/context';
import { useT } from '@/shared/i18n';
import { Surface, Text } from '@/shared/ui';
import { layer, space } from '@/styles/tokens.stylex';

const styles = stylex.create({
  root: {
    position: 'fixed',
    insetInline: space.pageX,
    top: space.md,
    zIndex: layer.overlay,
    pointerEvents: 'none',
  },
});

/** 실시간 동기화가 실패해 화면이 최신이 아닐 수 있음을 알린다. 재시도가 성공하면 사라진다. */
export function SyncErrorNotice() {
  const t = useT();
  const error = useTaskSyncError();
  if (error === null) return null;
  return (
    <div {...stylex.props(styles.root)}>
      <Surface tone="dangerSoft" radius="lg" padding="sm" elevation="md" role="status">
        <Text variant="bodySm" tone="danger" align="center">
          {t.common.error.syncFailed}
        </Text>
      </Surface>
    </div>
  );
}
