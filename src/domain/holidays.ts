import { addDays, isoWeekday } from './dates';
import type { DayInfo, ISODate } from './types';

/** Названия фиксированных праздников по `MM-DD`. */
const FIXED: Record<string, string> = {
  '01-01': 'Новый год', '01-02': 'Новый год', '01-03': 'Новый год', '01-04': 'Новый год',
  '01-05': 'Новый год', '01-06': 'Новый год', '01-07': 'Рождество Христово', '01-08': 'Новый год',
  '02-23': 'День защитника Отечества',
  '03-08': 'Международный женский день',
  '05-01': 'Праздник Весны и Труда',
  '05-09': 'День Победы',
  '06-12': 'День России',
  '11-04': 'День народного единства',
};
const TRANSFER = 'Перенос выходного';

function range(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

interface YearData { off: ISODate[]; shortened: ISODate[] }

const YEARS: Record<number, YearData> = {
  2025: {
    off: [
      ...range('2025-01-01', '2025-01-08'), '2025-02-23', '2025-03-08', ...range('2025-05-01', '2025-05-04'),
      ...range('2025-05-08', '2025-05-11'), ...range('2025-06-12', '2025-06-15'),
      ...range('2025-11-02', '2025-11-04'), '2025-12-31',
    ],
    // 1 ноября — рабочая суббота
    shortened: ['2025-03-07', '2025-04-30', '2025-05-07', '2025-06-11', '2025-11-01'],
  },
  2026: {
    off: [
      ...range('2026-01-01', '2026-01-11'), '2026-02-23', '2026-03-08', '2026-03-09',
      ...range('2026-05-01', '2026-05-03'), ...range('2026-05-09', '2026-05-11'),
      ...range('2026-06-12', '2026-06-14'), '2026-11-04', '2026-12-31',
    ],
    shortened: ['2026-04-30', '2026-05-08', '2026-06-11', '2026-11-03'],
  },
};

const isWeekend = (day: ISODate): boolean => isoWeekday(day) >= 6;

function build(): Map<ISODate, DayInfo> {
  const map = new Map<ISODate, DayInfo>();
  for (const y of Object.values(YEARS)) {
    for (const d of y.off) {
      const name = FIXED[d.slice(5)];
      if (name) map.set(d, { kind: 'holiday', name });
      else if (isWeekend(d)) map.set(d, { kind: 'weekend' });
      else map.set(d, { kind: 'holiday', name: TRANSFER });
    }
    for (const d of y.shortened) map.set(d, { kind: 'shortened' });
  }
  return map;
}

const CALENDAR = build();

export function getDayInfo(day: ISODate): DayInfo {
  const known = CALENDAR.get(day);
  if (known) return { ...known };
  if (YEARS[Number(day.slice(0, 4))]) return { kind: isWeekend(day) ? 'weekend' : 'workday' };
  const name = FIXED[day.slice(5)];
  if (name) return { kind: 'holiday', name };
  return { kind: isWeekend(day) ? 'weekend' : 'workday' };
}
