import { type ReactNode, useEffect } from 'react';
import * as styles from './bottom-sheet.css';

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlayWrap}>
      <button type="button" aria-label="닫기" className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.handle} aria-hidden="true" />
        {title ? <h2 className={styles.title}>{title}</h2> : null}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
