import type { ISODate, Weekday } from './types';

const pad = (n: number, w = 2): string => String(n).padStart(w, '0');

function parts(s: ISODate): [number, number, number] {
  const [y, m, d] = s.split('-').map(Number);
  return [y, m, d];
}

function fromUTC(ms: number): ISODate {
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** UTC-полдень даты в миллисекундах (устойчив к DST). */
function utcMs(s: ISODate): number {
  const [y, m, d] = parts(s);
  return Date.UTC(y, m - 1, d, 12);
}

export function toISODate(d: Date): ISODate {
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** Полночь локального времени. */
export function parseISODate(s: ISODate): Date {
  const [y, m, d] = parts(s);
  return new Date(y, m - 1, d);
}
export function todayISO(): ISODate { return toISODate(new Date()); }
export function addDays(s: ISODate, n: number): ISODate {
  const [y, m, d] = parts(s);
  return fromUTC(Date.UTC(y, m - 1, d + n, 12));
}
/** Прибавляет месяцы; день обрезается до конца месяца (31 янв + 1 = 28/29 фев). */
export function addMonths(s: ISODate, n: number): ISODate {
  const [y, m, d] = parts(s);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${pad(ny, 4)}-${pad(nm + 1)}-${pad(Math.min(d, last))}`;
}
/** Количество дней от `a` до `b` (b − a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((utcMs(b) - utcMs(a)) / 86400000);
}
export function isoWeekday(s: ISODate): Weekday {
  const w = new Date(utcMs(s)).getUTCDay();
  return (w === 0 ? 7 : w) as Weekday;
}
/** Понедельник недели, содержащей дату. */
export function startOfWeek(s: ISODate): ISODate { return addDays(s, 1 - isoWeekday(s)); }
/** 7 дат Пн–Вс недели, содержащей дату. */
export function weekDates(s: ISODate): ISODate[] {
  const start = startOfWeek(s);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
/** 42 даты (6 недель) сетки месяца, начиная с понедельника на/до 1-го числа. */
export function monthGrid(s: ISODate): ISODate[] {
  const [y, m] = parts(s);
  const start = startOfWeek(`${pad(y, 4)}-${pad(m)}-01`);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export type RuDateStyle = 'weekday' | 'weekdayShort' | 'dayMonth' | 'monthYear' | 'full';

const WEEKDAYS = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
const WEEKDAYS_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const MONTHS_NOM = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];

export const weekdayNameRu = (w: Weekday): string => WEEKDAYS[w - 1];
export const weekdayShortRu = (w: Weekday): string => WEEKDAYS_SHORT[w - 1];
export const monthGenitiveRu = (month: number): string => MONTHS_GEN[month - 1];

/**
 * weekday: «понедельник»; weekdayShort: «пн»; dayMonth: «5 октября»;
 * monthYear: «Октябрь 2026»; full: «понедельник, 5 октября 2026».
 */
export function formatRu(s: ISODate, style: RuDateStyle): string {
  const [y, m, d] = parts(s);
  const wd = isoWeekday(s);
  switch (style) {
    case 'weekday': return WEEKDAYS[wd - 1];
    case 'weekdayShort': return WEEKDAYS_SHORT[wd - 1];
    case 'dayMonth': return `${d} ${MONTHS_GEN[m - 1]}`;
    case 'monthYear': {
      const name = MONTHS_NOM[m - 1];
      return `${name[0].toUpperCase()}${name.slice(1)} ${y}`;
    }
    case 'full': return `${WEEKDAYS[wd - 1]}, ${d} ${MONTHS_GEN[m - 1]} ${y}`;
  }
}
/** «5 – 11 октября 2026», «28 сентября – 4 октября 2026», «29 декабря 2025 – 4 января 2026». */
export function weekRangeLabel(weekStart: ISODate): string {
  const [y1, m1, d1] = parts(weekStart);
  const [y2, m2, d2] = parts(addDays(weekStart, 6));
  if (y1 !== y2) return `${d1} ${MONTHS_GEN[m1 - 1]} ${y1} – ${d2} ${MONTHS_GEN[m2 - 1]} ${y2}`;
  if (m1 !== m2) return `${d1} ${MONTHS_GEN[m1 - 1]} – ${d2} ${MONTHS_GEN[m2 - 1]} ${y2}`;
  return `${d1} – ${d2} ${MONTHS_GEN[m2 - 1]} ${y2}`;
}
