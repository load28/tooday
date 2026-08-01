import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { type SurfaceVariantProps, surface } from '@/shared/ui/surface.css';
import { cx } from '@/styles/cx';

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
