import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  label: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function Dialog({ label, onClose, children, wide }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => {
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) prev.focus();
    };
  }, []);
  return (
    <div className="overlay no-print" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={label} className={wide ? 'dialog wide' : 'dialog'} tabIndex={-1} ref={ref}>
        <div className="dialog-head">
          <h2 className="dialog-title">{label}</h2>
          <button type="button" className="icon-btn" aria-label="Закрыть" onClick={onClose}>×</button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  );
}
