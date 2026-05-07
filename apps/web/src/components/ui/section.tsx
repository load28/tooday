import type { ReactNode } from 'react';
import { css, cx } from 'styled-system/css';
import { Stack } from './stack';
import { Text } from './text';

type SectionProps = {
  title?: ReactNode;
  trailing?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
};

const headerCls = css({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '3',
  paddingX: '5',
  paddingY: '2',
});

export function Section({ title, trailing, description, children, className }: SectionProps) {
  const showHeader = title != null || trailing != null || description != null;
  return (
    <Stack as="section" gap="2" className={className}>
      {showHeader ? (
        <header className={headerCls}>
          <Stack gap="0.5">
            {title != null ? (
              typeof title === 'string' ? (
                <Text variant="overline" tone="tertiary">
                  {title}
                </Text>
              ) : (
                title
              )
            ) : null}
            {description != null ? (
              typeof description === 'string' ? (
                <Text variant="caption" tone="tertiary">
                  {description}
                </Text>
              ) : (
                description
              )
            ) : null}
          </Stack>
          {trailing != null ? (
            <div className={cx(css({ display: 'flex', alignItems: 'center', gap: '2' }))}>{trailing}</div>
          ) : null}
        </header>
      ) : null}
      <div>{children}</div>
    </Stack>
  );
}
