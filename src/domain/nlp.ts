import { addDays, addMonths, isoWeekday } from './dates';
import type { ISODate, QuickInputResult, Recurrence, TaskColor, Weekday } from './types';

const L = '[\\p{L}\\p{N}]';
const B = `(?<!${L})`; // граница слева
const E = `(?!${L})`; // граница справа

const WEEKDAY_RE = [
  'понедельник\\p{L}*|пн', 'вторник\\p{L}*|вт', 'сред\\p{L}*|ср', 'четверг\\p{L}*|чт',
  'пятниц\\p{L}*|пт', 'суббот\\p{L}*|сб', 'воскресен\\p{L}*|вс',
];
const WD = `(${WEEKDAY_RE.map((w) => `(?:${w})`).join('|')})`;

function weekdayOf(word: string): Weekday {
  const idx = WEEKDAY_RE.findIndex((re) => new RegExp(`^(?:${re})$`, 'u').test(word));
  return (idx + 1) as Weekday;
}

const COLORS: [RegExp, TaskColor][] = [
  [/^(красн\p{L}*|red)$/u, 'red'],
  [/^(оранжев\p{L}*|orange)$/u, 'orange'],
  [/^(желт\p{L}*|yellow)$/u, 'yellow'],
  [/^(зелен\p{L}*|green)$/u, 'green'],
  [/^(син\p{L}*|голуб\p{L}*|blue)$/u, 'blue'],
  [/^(фиолетов\p{L}*|purple)$/u, 'purple'],
  [/^(сер\p{L}*|gray|grey)$/u, 'gray'],
];

const MONTHS: [string, number][] = [
  ['янв', 1], ['фев', 2], ['мар', 3], ['апр', 4], ['ма[йя]', 5], ['июн', 6],
  ['июл', 7], ['авг', 8], ['сен', 9], ['окт', 10], ['ноя', 11], ['дек', 12],
];

const pad = (n: number): string => String(n).padStart(2, '0');

function validDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function nextWeekdayOnOrAfter(today: ISODate, wds: Weekday[]): ISODate {
  for (let i = 0; i < 7; i += 1) {
    const d = addDays(today, i);
    if (wds.includes(isoWeekday(d))) return d;
  }
  return today;
}

export function parseQuickInput(text: string, today: ISODate): QuickInputResult {
  const orig = text;
  let n = text.toLowerCase().replace(/ё/g, 'е');
  const del = new Array<boolean>(n.length).fill(false);

  /** Находит первое совпадение, вырезает его и возвращает. */
  const take = (re: RegExp, test?: (m: RegExpExecArray) => boolean): RegExpExecArray | null => {
    const g = new RegExp(re.source, `${re.flags.replace('g', '')}g`);
    let m: RegExpExecArray | null;
    while ((m = g.exec(n)) !== null) {
      if (m[0] === '') { g.lastIndex += 1; continue; }
      if (test && !test(m)) continue;
      for (let i = m.index; i < m.index + m[0].length; i += 1) del[i] = true;
      n = n.slice(0, m.index) + ' '.repeat(m[0].length) + n.slice(m.index + m[0].length);
      return m;
    }
    return null;
  };

  let date: ISODate | null = null;
  let time: string | null = null;
  let recurrence: Recurrence | null = null;
  let color: TaskColor | null = null;
  let recurDate: ISODate | null = null;

  // цвет
  const cm = take(/(?<=^|\s)!([\p{L}]+)/u, (m) => COLORS.some(([re]) => re.test(m[1])));
  if (cm) color = COLORS.find(([re]) => re.test(cm[1]))![1];

  // повтор
  let m: RegExpExecArray | null;
  if ((m = take(new RegExp(`${B}кажды[е]\\s+(\\d+)\\s+(дн\\p{L}*|недел\\p{L}*|месяц\\p{L}*|лет|год\\p{L}*)${E}`, 'u')))) {
    const k = Math.max(1, parseInt(m[1], 10));
    const unit = m[2];
    const freq = unit.startsWith('дн') ? 'daily' : unit.startsWith('нед') ? 'weekly' : unit.startsWith('мес') ? 'monthly' : 'yearly';
    recurrence = { freq, interval: k };
  } else if ((m = take(new RegExp(`${B}(?:кажд\\p{L}*\\s+день|ежедневно)${E}`, 'u')))) {
    recurrence = { freq: 'daily', interval: 1 };
  } else if (take(new RegExp(`${B}(?:кажд\\p{L}*\\s+недел\\p{L}*|еженедельно)${E}`, 'u'))) {
    recurrence = { freq: 'weekly', interval: 1 };
  } else if (take(new RegExp(`${B}(?:кажд\\p{L}*\\s+месяц|ежемесячно)${E}`, 'u'))) {
    recurrence = { freq: 'monthly', interval: 1 };
  } else if (take(new RegExp(`${B}(?:кажд\\p{L}*\\s+год|ежегодно)${E}`, 'u'))) {
    recurrence = { freq: 'yearly', interval: 1 };
  } else if ((m = take(new RegExp(`${B}кажд\\p{L}*\\s+${WD}${E}`, 'u')))) {
    recurrence = { freq: 'weekly', interval: 1, weekdays: [weekdayOf(m[1])] };
  } else if (take(new RegExp(`${B}по\\s+будн\\p{L}*${E}`, 'u'))) {
    recurrence = { freq: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5] };
  } else if (take(new RegExp(`${B}по\\s+выходн\\p{L}*${E}`, 'u'))) {
    recurrence = { freq: 'weekly', interval: 1, weekdays: [6, 7] };
  } else if ((m = take(new RegExp(`${B}по\\s+${WD}${E}`, 'u')))) {
    recurrence = { freq: 'weekly', interval: 1, weekdays: [weekdayOf(m[1])] };
  }
  if (recurrence?.weekdays) recurDate = nextWeekdayOnOrAfter(today, recurrence.weekdays);

  // дата
  if (take(new RegExp(`${B}послезавтра${E}`, 'u'))) date = addDays(today, 2);
  else if (take(new RegExp(`${B}завтра${E}`, 'u'))) date = addDays(today, 1);
  else if (take(new RegExp(`${B}сегодня${E}`, 'u'))) date = today;
  else if ((m = take(new RegExp(`${B}через\\s+(?:(\\d+)\\s+)?(дн\\p{L}*|недел\\p{L}*|месяц\\p{L}*)${E}`, 'u')))) {
    const k = m[1] ? parseInt(m[1], 10) : 1;
    date = m[2].startsWith('дн') ? addDays(today, k)
      : m[2].startsWith('нед') ? addDays(today, 7 * k) : addMonths(today, k);
  } else if ((m = take(new RegExp(`${B}(?:в|во|на)\\s+${WD}${E}`, 'u')))) {
    date = nextWeekdayOnOrAfter(today, [weekdayOf(m[1])]);
  } else {
    const monthRe = MONTHS.map(([s]) => s).join('|');
    const [ty] = today.split('-').map(Number);
    const yearFor = (mo: number, d: number): number => {
      const cand = `${ty}-${pad(mo)}-${pad(d)}`;
      return cand < today ? ty + 1 : ty;
    };
    if ((m = take(new RegExp(`${B}(\\d{1,2})\\s+(${monthRe})\\p{L}*\\.?(?:\\s+(\\d{4}))?${E}`, 'u'),
      (mm) => {
        const mo = MONTHS.find(([s]) => new RegExp(`^(?:${s})`, 'u').test(mm[2]))![1];
        return validDate(mm[3] ? +mm[3] : 2000, mo, +mm[1]) || (mo === 2 && +mm[1] === 29);
      }))) {
      const mo = MONTHS.find(([s]) => new RegExp(`^(?:${s})`, 'u').test(m![2]))![1];
      const d = +m[1];
      date = `${m[3] ? +m[3] : yearFor(mo, d)}-${pad(mo)}-${pad(d)}`;
    } else if ((m = take(new RegExp(`(?<![\\p{N}.])(\\d{1,2})\\.(\\d{1,2})(?:\\.(\\d{4}))?(?![\\p{N}]|\\.\\p{N})`, 'u'),
      (mm) => validDate(mm[3] ? +mm[3] : 2000, +mm[2], +mm[1])))) {
      const mo = +m[2];
      const d = +m[1];
      date = `${m[3] ? +m[3] : yearFor(mo, d)}-${pad(mo)}-${pad(d)}`;
    }
  }

  // время
  if ((m = take(new RegExp(`(?:${B}в\\s+)?(?<![\\p{N}:])(\\d{1,2}):(\\d{2})(?![\\p{N}:])`, 'u'), (mm) => +mm[1] <= 23 && +mm[2] <= 59))) {
    time = `${pad(+m[1])}:${m[2]}`;
  } else if ((m = take(
    new RegExp(`${B}в\\s+(\\d{1,2})(?:\\s+(утра|вечера|дня|ночи))?(?![\\p{N}:.])(?!\\s*(?:час|мин|раз|человек|штук))`, 'u'),
    (mm) => +mm[1] <= 23,
  ))) {
    let h = +m[1];
    const part = m[2];
    if (part === 'вечера' && h < 12) h += 12;
    else if (part === 'дня' && h < 12 && h >= 1 && h <= 6) h += 12;
    else if (part === 'ночи' && h === 12) h = 0;
    time = `${pad(h)}:00`;
  }

  if (!date) {
    if (recurDate) date = recurDate;
    else if (time || recurrence) date = today;
  }

  let title = '';
  for (let i = 0; i < orig.length; i += 1) if (!del[i]) title += orig[i];
  title = title.replace(/\s+/g, ' ').replace(/^[\s,;:.\-–—]+|[\s,;:\-–—]+$/g, '').trim();
  if (!title) title = orig.trim();

  return { title, date, time, recurrence, color };
}
