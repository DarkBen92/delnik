import { getDayInfo } from './holidays';

describe('production calendar of Russia', () => {
  it('marks 2026 holidays, transfers and shortened days', () => {
    expect(getDayInfo('2026-01-01')).toEqual({ kind: 'holiday', name: 'Новый год' });
    expect(getDayInfo('2026-01-07').kind).toBe('holiday');
    expect(getDayInfo('2026-01-09').kind).toBe('holiday'); // перенос с 3 января
    expect(getDayInfo('2026-01-12').kind).toBe('workday');
    expect(getDayInfo('2026-02-23')).toEqual({ kind: 'holiday', name: 'День защитника Отечества' });
    expect(getDayInfo('2026-03-09').kind).toBe('holiday'); // перенос с 8 марта
    expect(getDayInfo('2026-05-01').name).toBe('Праздник Весны и Труда');
    expect(getDayInfo('2026-05-11').kind).toBe('holiday');
    expect(getDayInfo('2026-06-12').name).toBe('День России');
    expect(getDayInfo('2026-11-04').name).toBe('День народного единства');
    expect(getDayInfo('2026-12-31').kind).toBe('holiday'); // перенос с 4 января
    expect(getDayInfo('2026-11-03').kind).toBe('shortened');
    expect(getDayInfo('2026-04-30').kind).toBe('shortened');
  });

  it('marks regular weekends and workdays', () => {
    expect(getDayInfo('2026-10-05').kind).toBe('workday');
    expect(getDayInfo('2026-10-10').kind).toBe('weekend');
    expect(getDayInfo('2026-10-11').kind).toBe('weekend');
  });

  it('falls back to fixed federal holidays for years without data', () => {
    expect(getDayInfo('2030-06-12')).toEqual({ kind: 'holiday', name: 'День России' });
    expect(getDayInfo('2030-03-08').name).toBe('Международный женский день');
    expect(getDayInfo('2030-06-13').kind).toBe('workday'); // четверг
  });
});
