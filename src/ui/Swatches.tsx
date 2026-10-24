import { TASK_COLORS, type TaskColor } from '../domain/types';
import { COLOR_LABELS, MARKERS } from './util';

/** Цветные кружки-радио; обёртку с role="radiogroup" задаёт вызывающий. */
export function Swatches({ value, onPick }: { value: TaskColor; onPick: (c: TaskColor) => void }) {
  return (
    <>
      {TASK_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={COLOR_LABELS[c]}
          title={COLOR_LABELS[c]}
          className={`swatch${c === 'none' ? ' none' : ''}`}
          style={{ background: c === 'none' ? undefined : MARKERS[c].bg }}
          onClick={() => onPick(c)}
        />
      ))}
    </>
  );
}

/** Кружок цвета тэга; у тэга без цвета — пустое кольцо. */
export function TagDot({ color, className = '' }: { color: TaskColor; className?: string }) {
  return (
    <span
      className={`tag-dot${color === 'none' ? ' none' : ''}${className ? ` ${className}` : ''}`}
      style={color === 'none' ? undefined : { background: MARKERS[color].bg }}
      aria-hidden="true"
    />
  );
}
