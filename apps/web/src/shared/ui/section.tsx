import type { ReactNode } from 'react';
import { css } from 'styled-system/css';
import { Stack } from '@/shared/ui/stack';
import { Text } from '@/shared/ui/text';

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
  gap: 'xl',
  paddingX: '3xl',
  paddingY: 'md',
});

export function Section({ title, trailing, description, children, className }: SectionProps) {
  const showHeader = title != null || trailing != null || description != null;
  return (
    <Stack as="section" gap="md" className={className}>
      {showHeader ? (
        <header className={headerCls}>
          <Stack gap="2xs">
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
          {trailing != null ? <div className={css({ display: 'flex', alignItems: 'center', gap: 'md' })}>{trailing}</div> : null}
        </header>
      ) : null}
      <div>{children}</div>
    </Stack>
  );
}
