import { ToggleGroup } from '@ark-ui/react/toggle-group';
import { css, cva } from 'styled-system/css';
import type { DayCell } from '@/features/today/week';
import { BaseButton } from '@/shared/ui';

const stripCls = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 'xs',
  paddingTop: 'md',
  paddingBottom: '2xl',
  paddingX: 'xl',
});

// 셀 고유 스타일만 — 리셋·포커스 링은 BaseButton이, 선택 룩은 Ark data-state(_on)가 처리한다.
const cellRecipe = cva({
  base: {
    flexDirection: 'column',
    paddingTop: 'md',
    paddingBottom: 'sm',
    borderRadius: 'lg',
    transition: 'background {durations.base} {easings.standard}, color {durations.base} {easings.standard}',
    _on: { background: 'primary', color: 'onPrimary' },
  },
  variants: {
    tone: {
      idle: { color: 'textTertiary' },
      today: { color: 'primary' },
    },
  },
});

const dowCls = css({ textStyle: 'micro', marginBottom: 'xs' });
const dayCls = css({ textStyle: 'numericLg' });

const dotRecipe = cva({
  base: {
    width: 'xs',
    height: 'xs',
    borderRadius: 'pill',
    marginTop: 'xs',
  },
  variants: {
    mark: {
      none: { background: 'transparent' },
      tasks: { background: 'primary', '[data-state="on"] &': { background: 'onPrimaryMuted' } },
    },
  },
});

type WeekStripProps = {
  days: DayCell[];
  activeOffset: number;
  hasTasks: (day: DayCell) => boolean;
  onSelect: (offset: number) => void;
};

export function WeekStrip({ days, activeOffset, hasTasks, onSelect }: WeekStripProps) {
  return (
    <ToggleGroup.Root
      value={[String(activeOffset)]}
      onValueChange={(details) => {
        // 단일 선택 — 선택된 셀을 다시 눌러 빈 상태가 되는 것은 무시한다
        const next = details.value[0];
        if (next !== undefined) onSelect(Number(next));
      }}
      className={stripCls}
    >
      {days.map((d) => (
        <ToggleGroup.Item key={d.key} value={String(d.offset)} asChild>
          <BaseButton aria-label={d.label} className={cellRecipe({ tone: d.isToday ? 'today' : 'idle' })}>
            <span className={dowCls}>{d.dow}</span>
            <span className={dayCls}>{d.day}</span>
            <span className={dotRecipe({ mark: hasTasks(d) ? 'tasks' : 'none' })} />
          </BaseButton>
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
