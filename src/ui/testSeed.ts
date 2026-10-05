import { data as fixtureData, task } from '../domain/fixtures';
import type { AppData, Settings, Task } from '../domain/types';

export const STORAGE_KEY = 'delnik:data:v1';

/** Кладёт в localStorage данные с календарём `cal` и списком `list` («Когда-нибудь»). */
export function seed(tasks: Task[] = [], settings: Partial<Settings> = {}): AppData {
  const d = fixtureData(tasks);
  const out = { ...d, settings: { ...d.settings, ...settings } };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  return out;
}

export { task };
