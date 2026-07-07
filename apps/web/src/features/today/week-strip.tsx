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

// 리셋·포커스 링은 BaseButton이 제공 — 여기는 셀 고유 레이아웃·상태 색만 얹는다.
const cellRecipe = cva({
  base: {
    flexDirection: 'column',
    paddingTop: 'md',
    paddingBottom: 'sm',
    borderRadius: 'lg',
    transition: 'background {durations.base} {easings.standard}, color {durations.base} {easings.standard}',
  },
  variants: {
    state: {
      idle: { color: 'textTertiary' },
      today: { color: 'primary' },
      active: { background: 'primary', color: 'onPrimary' },
    },
  },
});

const dowCls = css({ textStyle: 'micro', marginBottom: 'xs' });
const dayCls = css({ fontSize: '16px', fontWeight: 700, lineHeight: '20px', fontFeatureSettings: '"tnum" 1' });

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
      tasks: { background: 'primary' },
      activeTasks: { background: 'rgba(255, 255, 255, 0.6)' },
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
    <div className={stripCls}>
      {days.map((d) => {
        const isActive = d.offset === activeOffset;
        const marked = hasTasks(d);
        return (
          <BaseButton
            key={d.key}
            aria-label={d.label}
            aria-pressed={isActive}
            onClick={() => onSelect(d.offset)}
            className={cellRecipe({ state: isActive ? 'active' : d.isToday ? 'today' : 'idle' })}
          >
            <span className={dowCls}>{d.dow}</span>
            <span className={dayCls}>{d.day}</span>
            <span className={dotRecipe({ mark: marked ? (isActive ? 'activeTasks' : 'tasks') : 'none' })} />
          </BaseButton>
        );
      })}
    </div>
  );
}
