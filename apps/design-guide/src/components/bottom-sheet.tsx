import { type CSSProperties, type ReactNode, useEffect } from 'react';
import { TOKENS } from '@/lib/tokens';

export const sheetStyles: Record<string, CSSProperties> = {
  wrap: {
    position: 'absolute',
    inset: 0,
    zIndex: 60,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    inset: 0,
    background: TOKENS.color.overlay,
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    animation: 'tooday-fade-in 180ms ease',
  },
  sheet: {
    position: 'relative',
    width: '100%',
    background: TOKENS.color.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: '10px 20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    boxShadow: '0 -8px 32px rgba(15, 19, 36, 0.16)',
    animation: 'tooday-slide-up 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    maxHeight: '85%',
    overflowY: 'auto',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    background: TOKENS.color.borderStrong,
    alignSelf: 'center',
    marginBottom: 4,
    flex: '0 0 auto',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    margin: 0,
    color: TOKENS.color.textPrimary,
  },
  body: { display: 'flex', flexDirection: 'column', gap: 12 },
};

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div style={sheetStyles.wrap}>
      <button type="button" style={sheetStyles.backdrop} aria-label="닫기" onClick={onClose} />
      <div style={sheetStyles.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <div style={sheetStyles.handle} aria-hidden="true" />
        {title ? <h2 style={sheetStyles.title}>{title}</h2> : null}
        <div style={sheetStyles.body}>{children}</div>
      </div>
    </div>
  );
}
