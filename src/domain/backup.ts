import { makeId } from './ids';
import { addTag } from './tags';
import type { AppData, Calendar, SomedayList, Tag, Task } from './types';

export interface CalendarSnapshot {
  calendar: Calendar;
  lists: SomedayList[];
  tasks: Task[];
  /** Тэги задач календаря; в старых ссылках поля нет. */
  tags?: Tag[];
}

const NOT_BACKUP = 'Это не файл резервной копии Дельника';
const BAD_VERSION = 'Неподдерживаемая версия резервной копии';

/** JSON `{ app: "delnik", schemaVersion: 1, exportedAt, data }`. */
export function serializeBackup(data: AppData): string {
  return JSON.stringify({ app: 'delnik', schemaVersion: 1, exportedAt: new Date().toISOString(), data }, null, 2);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Бросает Error с русским сообщением, если файл не резервная копия Дельника. */
export function parseBackup(text: string): AppData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(NOT_BACKUP);
  }
  if (!isObj(raw) || raw.app !== 'delnik') throw new Error(NOT_BACKUP);
  if (raw.schemaVersion !== 1) throw new Error(BAD_VERSION);
  const data = raw.data;
  if (!isObj(data) || !Array.isArray(data.calendars) || !Array.isArray(data.tasks)
    || !Array.isArray(data.lists) || !isObj(data.settings)) {
    throw new Error(NOT_BACKUP);
  }
  return data as unknown as AppData;
}

export function snapshotCalendar(data: AppData, calendarId: string): CalendarSnapshot {
  const calendar = data.calendars.find((c) => c.id === calendarId);
  if (!calendar) throw new Error('Календарь не найден');
  const tasks = data.tasks.filter((t) => t.calendarId === calendarId);
  const used = new Set(tasks.map((t) => t.tagId));
  return {
    calendar,
    lists: data.lists.filter((l) => l.calendarId === calendarId),
    tasks,
    tags: data.tags.filter((t) => used.has(t.id)),
  };
}

/** base64url(UTF-8 JSON) — безопасно для `#share=`. */
export function encodeShare(s: CalendarSnapshot): string {
  const bytes = new TextEncoder().encode(JSON.stringify(s));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeShare(s: string): CalendarSnapshot {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const snap = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!isObj(snap) || !isObj(snap.calendar) || !Array.isArray(snap.lists) || !Array.isArray(snap.tasks)) {
      throw new Error('shape');
    }
    return snap as unknown as CalendarSnapshot;
  } catch {
    throw new Error('Некорректная ссылка на календарь');
  }
}

/** Добавляет снимок как новый календарь с новыми id (вложения не переносятся). Возвращает данные и id календаря.
 *  Тэги сливаются с существующими по названию. */
export function importSnapshot(data: AppData, s: CalendarSnapshot): { data: AppData; calendarId: string } {
  const calendarId = makeId();
  let base: AppData = { ...data, tags: data.tags ?? [] };
  const tagIds = new Map<string, string>();
  for (const tag of s.tags ?? []) {
    const r = addTag(base, tag.name, tag.color);
    base = r.data;
    if (r.tag) tagIds.set(tag.id, r.tag.id);
  }
  const listIds = new Map<string, string>();
  const lists = s.lists.map((l) => {
    const id = makeId();
    listIds.set(l.id, id);
    return { ...l, id, calendarId };
  });
  const tasks = s.tasks.map((t) => ({
    ...t,
    id: makeId(),
    calendarId,
    tagId: (t.tagId && tagIds.get(t.tagId)) ?? null,
    listId: t.listId === null ? null : listIds.get(t.listId) ?? null,
    attachments: [],
  }));
  return {
    data: {
      ...base,
      calendars: [...data.calendars, { ...s.calendar, id: calendarId, stickers: { ...s.calendar.stickers } }],
      lists: [...data.lists, ...lists],
      tasks: [...data.tasks, ...tasks],
    },
    calendarId,
  };
}
