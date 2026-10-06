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

/** Активный календарь должен существовать. */
export function normalize(d: AppData): AppData {
  if (d.calendars.some((c) => c.id === d.settings.activeCalendarId)) return d;
  return { ...d, settings: { ...d.settings, activeCalendarId: d.calendars[0].id } };
}

export function saveData(d: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    /* переполнение или приватный режим — не роняем интерфейс */
  }
}
