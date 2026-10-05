import { addDays, diffDays, isoWeekday, startOfWeek, weekdayShortRu } from './dates';
import type { ISODate, Recurrence, Task, Weekday } from './types';

function matchesRule(r: Recurrence, start: ISODate, day: ISODate): boolean {
  const interval = Math.max(1, r.interval || 1);
  const diff = diffDays(start, day);
  if (diff < 0) return false;
  switch (r.freq) {
    case 'daily':
      return diff % interval === 0;
    case 'weekly': {
      const wds = r.weekdays && r.weekdays.length ? r.weekdays : [isoWeekday(start)];
      if (!wds.includes(isoWeekday(day))) return false;
      const weeks = diffDays(startOfWeek(start), startOfWeek(day)) / 7;
      return weeks % interval === 0;
    }
    case 'monthly': {
      const [sy, sm, sd] = start.split('-').map(Number);
      const [y, m, d] = day.split('-').map(Number);
      return d === sd && ((y - sy) * 12 + (m - sm)) % interval === 0;
    }
    case 'yearly': {
      const [sy, sm, sd] = start.split('-').map(Number);
      const [y, m, d] = day.split('-').map(Number);
      return m === sm && d === sd && (y - sy) % interval === 0;
    }
  }
}

/** Происходит ли задача в этот день (учитывает дату начала, until, skippedDates; для неповторяющейся — date === day). */
export function occursOn(task: Task, day: ISODate): boolean {
  if (task.date === null) return false;
  if (!task.recurrence) return task.date === day;
  const r = task.recurrence;
  if (day < task.date) return false;
  if (r.until && day > r.until) return false;
  if (task.skippedDates.includes(day)) return false;
  return matchesRule(r, task.date, day);
}

/** Все даты вхождений в [from, to] включительно, по возрастанию. */
export function occurrencesBetween(task: Task, from: ISODate, to: ISODate): ISODate[] {
  if (task.date === null) return [];
  if (!task.recurrence) return task.date >= from && task.date <= to ? [task.date] : [];
  const end = task.recurrence.until && task.recurrence.until < to ? task.recurrence.until : to;
  const out: ISODate[] = [];
  for (let d = from < task.date ? task.date : from; d <= end; d = addDays(d, 1)) {
    if (occursOn(task, d)) out.push(d);
  }
  return out;
}

function plural(n: number, one: string, few: string, many: string): string {
  const a = n % 100;
  const b = n % 10;
  if (a >= 11 && a <= 14) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/** Человекочитаемое описание по-русски. */
export function describeRecurrence(r: Recurrence, start: ISODate): string {
  const n = Math.max(1, r.interval || 1);
  const [, m, d] = start.split('-').map(Number);
  switch (r.freq) {
    case 'daily':
      return n === 1 ? 'Каждый день' : `Каждые ${n} ${plural(n, 'день', 'дня', 'дней')}`;
    case 'weekly': {
      const wds: Weekday[] = r.weekdays && r.weekdays.length
        ? [...new Set(r.weekdays)].sort((a, b) => a - b)
        : [isoWeekday(start)];
      if (n === 1 && wds.length === 5 && wds.every((w, i) => w === i + 1)) return 'По будням';
      const head = n === 1 ? 'Каждую неделю' : `Каждые ${n} ${plural(n, 'неделю', 'недели', 'недель')}`;
      return `${head}: ${wds.map(weekdayShortRu).join(', ')}`;
    }
    case 'monthly': {
      const head = n === 1 ? 'Каждый месяц' : `Каждые ${n} ${plural(n, 'месяц', 'месяца', 'месяцев')}`;
      return `${head}, ${d} числа`;
    }
    case 'yearly': {
      const head = n === 1 ? 'Каждый год' : `Каждые ${n} ${plural(n, 'год', 'года', 'лет')}`;
      return `${head}, ${d} ${MONTHS_GEN[m - 1]}`;
    }
  }
}
