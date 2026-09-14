import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { Stack } from '@/shared/ui/stack';
import { Text } from '@/shared/ui/text';
import type { FlexSx } from '@/styles/sx';
import { space } from '@/styles/tokens.stylex';

const styles = stylex.create({
  header: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.xl,
    paddingInline: space['3xl'],
    paddingBlock: space.md,
  },
  trailing: { display: 'flex', alignItems: 'center', gap: space.md },
});

type SectionProps = {
  title?: ReactNode;
  trailing?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  sx?: FlexSx;
};

export function Section({ title, trailing, description, children, sx }: SectionProps) {
  const showHeader = title != null || trailing != null || description != null;
  return (
    <Stack as="section" gap="md" sx={sx}>
      {showHeader ? (
        <header {...stylex.props(styles.header)}>
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
          {trailing != null ? <div {...stylex.props(styles.trailing)}>{trailing}</div> : null}
        </header>
      ) : null}
      <div>{children}</div>
    </Stack>
  );
}
