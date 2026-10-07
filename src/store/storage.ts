import { createDefaultData } from '../domain/tasks';
import type { AppData } from '../domain/types';

export const STORAGE_KEY = 'delnik:data:v1';

/** Читает данные из localStorage и сливает настройки с дефолтами. */
export function loadData(): AppData {
  const def = createDefaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return def;
    const p = JSON.parse(raw) as Partial<AppData>;
    if (!p || p.schemaVersion !== 1 || !Array.isArray(p.calendars) || p.calendars.length === 0) return def;
    return normalize({
      ...def,
      ...p,
      calendars: p.calendars,
      lists: Array.isArray(p.lists) ? p.lists : def.lists,
      tasks: Array.isArray(p.tasks) ? p.tasks : [],
      settings: { ...def.settings, ...(p.settings ?? {}) },
    } as AppData);
  } catch {
    return def;
  }
}

/** Активный календарь должен существовать; старые ключи настроек убираем. */
export function normalize(d: AppData): AppData {
  // Раньше был «показывать выполненные»; его заменил «скрывать выполненные» (по умолчанию выключен),
  // поэтому старое значение не переносим: выполненные снова видны зачёркнутыми.
  const { showCompleted: _old, ...settings } = d.settings as AppData['settings'] & { showCompleted?: boolean };
  void _old;
  const fixed = { ...d, settings };
  if (fixed.calendars.some((c) => c.id === settings.activeCalendarId)) return fixed;
  return { ...fixed, settings: { ...settings, activeCalendarId: fixed.calendars[0].id } };
}

export function saveData(d: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    /* переполнение или приватный режим — не роняем интерфейс */
  }
}
