import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cx } from 'styled-system/css';
import { type SurfaceVariantProps, surface } from 'styled-system/recipes';

type SurfaceBase = SurfaceVariantProps & {
  className?: string;
  children?: ReactNode;
};

type SurfaceProps<T extends ElementType> = SurfaceBase & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof SurfaceBase | 'as'>;

export function Surface<T extends ElementType = 'div'>(props: SurfaceProps<T>) {
  const { as, tone, radius, elevation, padding, inset, bordered, className, children, ...rest } = props;
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag {...rest} className={cx(surface({ tone, radius, elevation, padding, inset, bordered }), className)}>
      {children}
    </Tag>
  );
}
