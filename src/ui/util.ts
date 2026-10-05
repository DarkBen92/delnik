import type { TaskColor, Weekday } from '../domain/types';

export const COLOR_LABELS: Record<TaskColor, string> = {
  none: 'Без цвета', red: 'Красный', orange: 'Оранжевый', yellow: 'Жёлтый',
  green: 'Зелёный', blue: 'Синий', purple: 'Фиолетовый', gray: 'Серый',
};

export const WEEKDAY_SHORT: Record<Weekday, string> = { 1: 'пн', 2: 'вт', 3: 'ср', 4: 'чт', 5: 'пт', 6: 'сб', 7: 'вс' };
export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

export const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Нет' },
  { value: '0', label: 'В момент начала' },
  { value: '5', label: 'За 5 минут' },
  { value: '10', label: 'За 10 минут' },
  { value: '15', label: 'За 15 минут' },
  { value: '30', label: 'За 30 минут' },
  { value: '60', label: 'За 1 час' },
  { value: '1440', label: 'За 1 день' },
];

export const STICKERS = [
  '🎉', '⭐', '❤️', '🔥', '✅', '🎂', '✈️', '🏖️', '💼', '📚', '🏋️', '🍕',
  '🎬', '🛒', '🧹', '💊', '🎁', '🌧️', '☀️', '🐶', '🚗', '💡', '🎵', '😴',
];

export function downloadBlob(name: string, content: BlobPart, mime: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  if (typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readText(file: Blob): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
  return `${(n / 1024 / 1024).toFixed(1)} МБ`;
}

export function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || typeof el.matches !== 'function') return false;
  return el.matches('input, textarea, select, [contenteditable="true"]');
}

/** Контрастный цвет текста для фона (#rrggbb). */
export function inkFor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#1b1b1b' : '#ffffff';
}
