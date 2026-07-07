import type { ReactNode } from 'react';
import { sectionHeader, sectionHeaderTrailing } from 'styled-system/recipes';
import { Stack } from '@/shared/ui/stack';
import { Text } from '@/shared/ui/text';

// 스타일은 config recipe(recipes/*의 `section*`). 근거: docs/conventions/ui-styling.md.

type SectionProps = {
  title?: ReactNode;
  trailing?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function Section({ title, trailing, description, children, className }: SectionProps) {
  const showHeader = title != null || trailing != null || description != null;
  return (
    <Stack as="section" gap="md" className={className}>
      {showHeader ? (
        <header className={sectionHeader()}>
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
          {trailing != null ? <div className={sectionHeaderTrailing()}>{trailing}</div> : null}
        </header>
      ) : null}
      <div>{children}</div>
    </Stack>
  );
}
