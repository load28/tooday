import { ToggleGroup } from '@ark-ui/react/toggle-group';
import type { DayCell } from '@/features/today/week';
import { cellRecipe, dayCls, dotRecipe, dowCls, stripCls } from '@/features/today/week-strip.css';
import { BaseButton } from '@/shared/ui';

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
