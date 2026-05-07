import type { ReactNode } from 'react';
import { css, cx } from 'styled-system/css';

const barCls = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingY: '1.5',
  paddingX: '3',
  gap: '2',
  minHeight: 'appBar',
});

const leadingCls = css({ display: 'flex', alignItems: 'center', gap: '1', minWidth: 0, flex: 1 });
const trailingCls = css({ display: 'flex', alignItems: 'center', gap: '1', flex: '0 0 auto' });
const titleCls = css({
  textStyle: 'subtitle',
  color: 'text',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

type AppBarProps = {
  title?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

export function AppBar({ title, leading, trailing, className }: AppBarProps) {
  return (
    <div className={cx(barCls, className)}>
      <div className={leadingCls}>
        {leading}
        {title != null ? typeof title === 'string' ? <span className={titleCls}>{title}</span> : title : null}
      </div>
      {trailing != null ? <div className={trailingCls}>{trailing}</div> : null}
    </div>
  );
}
