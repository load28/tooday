import { css, cva } from 'styled-system/css';
import type { DayCell } from '@/features/today/week';

const stripCls = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 'xs',
  paddingTop: 'md',
  paddingBottom: '2xl',
  paddingX: 'xl',
});

const cellRecipe = cva({
  base: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 'md',
    paddingBottom: 'sm',
    borderRadius: 'lg',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background {durations.base} {easings.standard}, color {durations.base} {easings.standard}',
    _focusVisible: { outline: 'none', boxShadow: 'focus' },
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
          <button
            key={d.key}
            type="button"
            aria-label={d.label}
            aria-pressed={isActive}
            onClick={() => onSelect(d.offset)}
            className={cellRecipe({ state: isActive ? 'active' : d.isToday ? 'today' : 'idle' })}
          >
            <span className={dowCls}>{d.dow}</span>
            <span className={dayCls}>{d.day}</span>
            <span className={dotRecipe({ mark: marked ? (isActive ? 'activeTasks' : 'tasks') : 'none' })} />
          </button>
        );
      })}
    </div>
  );
}
