import type { AppData, Calendar, SomedayList, Task } from './types';

export interface CalendarSnapshot {
  calendar: Calendar;
  lists: SomedayList[];
  tasks: Task[];
}

const NI = (): never => {
  throw new Error('not implemented');
};

/** JSON `{ app: "delnik", schemaVersion: 1, exportedAt, data }`. */
export function serializeBackup(_data: AppData): string { return NI(); }
/** Бросает Error с русским сообщением, если файл не резервная копия Дельника. */
export function parseBackup(_text: string): AppData { return NI(); }
export function snapshotCalendar(_data: AppData, _calendarId: string): CalendarSnapshot { return NI(); }
/** base64url(UTF-8 JSON) — безопасно для `#share=`. */
export function encodeShare(_s: CalendarSnapshot): string { return NI(); }
export function decodeShare(_s: string): CalendarSnapshot { return NI(); }
/** Добавляет снимок как новый календарь с новыми id (вложения не переносятся). Возвращает данные и id календаря. */
export function importSnapshot(_data: AppData, _s: CalendarSnapshot): { data: AppData; calendarId: string } { return NI(); }
