import { useEffect, useRef, type ReactNode } from 'react';
import { IconClose } from './icons';

interface Props {
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/** Модальное окно в стиле редактора задачи: светлая «карточка» со скруглением. */
export function Dialog({ label, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => {
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) prev.focus();
    };
  }, []);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={label} className="sheet" tabIndex={-1} ref={ref}>
        <div className="sheet-head">
          <h2>{label}</h2>
          <button type="button" className="tool" aria-label="Закрыть" onClick={onClose}><IconClose size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
