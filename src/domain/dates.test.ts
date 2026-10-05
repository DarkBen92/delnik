import {
  addDays, addMonths, diffDays, formatRu, isoWeekday, monthGrid, parseISODate, startOfWeek,
  toISODate, weekDates, weekRangeLabel,
} from './dates';

describe('dates', () => {
  it('converts between Date and ISO in local time', () => {
    expect(toISODate(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
    const d = parseISODate('2026-10-05');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 5, 0]);
  });

  it('adds days across months, years and DST', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-05', 0)).toBe('2026-10-05');
  });

  it('adds months clamping the day', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15');
    expect(addMonths('2026-03-15', -3)).toBe('2025-12-15');
  });

  it('diffs days', () => {
    expect(diffDays('2026-10-05', '2026-10-12')).toBe(7);
    expect(diffDays('2026-10-12', '2026-10-05')).toBe(-7);
    expect(diffDays('2026-03-01', '2026-04-01')).toBe(31);
  });

  it('uses ISO weekdays with Monday first', () => {
    expect(isoWeekday('2026-10-05')).toBe(1);
    expect(isoWeekday('2026-10-11')).toBe(7);
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05');
    expect(startOfWeek('2026-10-05')).toBe('2026-10-05');
    expect(startOfWeek('2026-01-01')).toBe('2025-12-29');
    expect(weekDates('2026-10-08')).toEqual([
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11',
    ]);
  });

  it('builds a 6x7 month grid starting on Monday', () => {
    const g = monthGrid('2026-10-17');
    expect(g).toHaveLength(42);
    expect(g[0]).toBe('2026-09-28');
    expect(g[3]).toBe('2026-10-01');
    expect(g[41]).toBe('2026-11-08');
    // месяц, начинающийся в понедельник
    expect(monthGrid('2026-06-10')[0]).toBe('2026-06-01');
  });

  it('formats in Russian', () => {
    expect(formatRu('2026-10-05', 'weekday')).toBe('понедельник');
    expect(formatRu('2026-10-11', 'weekdayShort')).toBe('вс');
    expect(formatRu('2026-10-05', 'dayMonth')).toBe('5 октября');
    expect(formatRu('2026-03-08', 'dayMonth')).toBe('8 марта');
    expect(formatRu('2026-05-01', 'monthYear')).toBe('Май 2026');
    expect(formatRu('2026-10-05', 'full')).toBe('понедельник, 5 октября 2026');
  });

  it('labels week ranges', () => {
    expect(weekRangeLabel('2026-10-05')).toBe('5 – 11 октября 2026');
    expect(weekRangeLabel('2026-09-28')).toBe('28 сентября – 4 октября 2026');
    expect(weekRangeLabel('2025-12-29')).toBe('29 декабря 2025 – 4 января 2026');
  });
});
