import type { CSSProperties, ReactNode } from 'react';

type IconProps = {
  d?: string;
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  children?: ReactNode;
  style?: CSSProperties;
};

export function Icon({ d, size = 20, stroke = 'currentColor', strokeWidth = 1.8, fill = 'none', children, style }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flex: '0 0 auto', ...style }}
    >
      {d ? <path d={d} /> : children}
    </svg>
  );
}

export const IconChevronLeft = (p: IconProps) => <Icon {...p} d="M15 18l-6-6 6-6" />;
export const IconChevronRight = (p: IconProps) => <Icon {...p} d="M9 18l6-6-6-6" />;
export const IconChevronDown = (p: IconProps) => <Icon {...p} d="M6 9l6 6 6-6" />;
export const IconBell = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 003.4 0" />
  </Icon>
);
export const IconPlus = (p: IconProps) => <Icon {...p} d="M12 5v14M5 12h14" strokeWidth={p.strokeWidth ?? 2.4} />;
export const IconCheck = (p: IconProps) => <Icon {...p} d="M20 6L9 17l-5-5" strokeWidth={p.strokeWidth ?? 2.6} />;
export const IconX = (p: IconProps) => <Icon {...p} d="M18 6L6 18M6 6l12 12" />;
export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
export const IconCalendar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 11h18" />
  </Icon>
);
export const IconGrid = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Icon>
);
export const IconSparkle = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" />
    <path d="M5 18l.8 2 2-.8-2-.8L5 16.5z" />
  </Icon>
);
export const IconCircle = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
  </Icon>
);
export const IconCheckCircle = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l3 3 5-6" strokeWidth={2.4} />
  </Icon>
);
export const IconLoader = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" opacity="0.25" />
    <path d="M21 12a9 9 0 00-9-9" />
  </Icon>
);
export const IconArrowRight = (p: IconProps) => <Icon {...p} d="M5 12h14M13 5l7 7-7 7" />;
export const IconCalendarOff = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.18 4.18A2 2 0 003 6v14a2 2 0 002 2h14c.53 0 1.04-.21 1.42-.58M21 15.5V6a2 2 0 00-2-2H7M3 3l18 18M16 2v4M8 2v4" />
  </Icon>
);
export const IconMore = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </Icon>
);
export const IconFlag = (p: IconProps) => <Icon {...p} d="M4 22V4M4 4h13l-2 4 2 4H4" />;
export const IconNote = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6M9 13h6M9 17h4" />
  </Icon>
);
export const IconTrash = (p: IconProps) => (
  <Icon {...p} d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
);
