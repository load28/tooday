import { ToggleGroup } from '@ark-ui/react/toggle-group';
import * as stylex from '@stylexjs/stylex';
import type { DayCell } from '@/features/today/week';
import { cellTones, dotMarks, styles } from '@/features/today/week-strip.styles';
import { BaseButton } from '@/shared/ui';
import { text } from '@/styles/text.styles';

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
      {...stylex.props(styles.strip)}
    >
      {days.map((d) => (
        <ToggleGroup.Item key={d.key} value={String(d.offset)} asChild>
          {/* dot 색은 셀이 변수로 내려준다 — 선택 상태(data-state)가 셀에 붙기 때문이다 */}
          <BaseButton
            aria-label={d.label}
            sx={[styles.cell, cellTones[d.isToday ? 'today' : 'idle'], dotMarks[hasTasks(d) ? 'tasks' : 'none']]}
          >
            <span {...stylex.props(text.micro, styles.dow)}>{d.dow}</span>
            <span {...stylex.props(text.numericLg)}>{d.day}</span>
            <span {...stylex.props(styles.dot)} />
          </BaseButton>
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
