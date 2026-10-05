import type { ISODate, Weekday } from './types';

const NI = (): never => {
  throw new Error('not implemented');
};

export function toISODate(_d: Date): ISODate { return NI(); }
/** Полночь локального времени. */
export function parseISODate(_s: ISODate): Date { return NI(); }
export function todayISO(): ISODate { return toISODate(new Date()); }
export function addDays(_s: ISODate, _n: number): ISODate { return NI(); }
/** Прибавляет месяцы; день обрезается до конца месяца (31 янв + 1 = 28/29 фев). */
export function addMonths(_s: ISODate, _n: number): ISODate { return NI(); }
/** Количество дней от `a` до `b` (b − a). */
export function diffDays(_a: ISODate, _b: ISODate): number { return NI(); }
export function isoWeekday(_s: ISODate): Weekday { return NI(); }
/** Понедельник недели, содержащей дату. */
export function startOfWeek(_s: ISODate): ISODate { return NI(); }
/** 7 дат Пн–Вс недели, содержащей дату. */
export function weekDates(_s: ISODate): ISODate[] { return NI(); }
/** 42 даты (6 недель) сетки месяца, начиная с понедельника на/до 1-го числа. */
export function monthGrid(_s: ISODate): ISODate[] { return NI(); }

export type RuDateStyle = 'weekday' | 'weekdayShort' | 'dayMonth' | 'monthYear' | 'full';
/**
 * weekday: «понедельник»; weekdayShort: «пн»; dayMonth: «5 октября»;
 * monthYear: «Октябрь 2026»; full: «понедельник, 5 октября 2026».
 */
export function formatRu(_s: ISODate, _style: RuDateStyle): string { return NI(); }
/** «5 – 11 октября 2026», «28 сентября – 4 октября 2026», «29 декабря 2025 – 4 января 2026». */
export function weekRangeLabel(_weekStart: ISODate): string { return NI(); }
