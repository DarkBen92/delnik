import { describeRecurrence, occurrencesBetween, occursOn } from './recurrence';
import { task } from './fixtures';

describe('recurrence', () => {
  it('non-recurring task occurs only on its date', () => {
    const t = task({ date: '2026-10-05' });
    expect(occursOn(t, '2026-10-05')).toBe(true);
    expect(occursOn(t, '2026-10-06')).toBe(false);
    expect(occursOn(task({ date: null, listId: 'list' }), '2026-10-05')).toBe(false);
  });

  it('daily with interval, never before start', () => {
    const t = task({ date: '2026-10-05', recurrence: { freq: 'daily', interval: 2 } });
    expect(occurrencesBetween(t, '2026-10-01', '2026-10-12')).toEqual([
      '2026-10-05', '2026-10-07', '2026-10-09', '2026-10-11',
    ]);
  });

  it('weekly on chosen weekdays every N weeks', () => {
    const t = task({ date: '2026-10-05', recurrence: { freq: 'weekly', interval: 2, weekdays: [1, 3] } });
    expect(occurrencesBetween(t, '2026-10-05', '2026-10-25')).toEqual([
      '2026-10-05', '2026-10-07', '2026-10-19', '2026-10-21',
    ]);
  });

  it('weekly without weekdays uses start weekday', () => {
    const t = task({ date: '2026-10-07', recurrence: { freq: 'weekly', interval: 1 } });
    expect(occurrencesBetween(t, '2026-10-01', '2026-10-21')).toEqual(['2026-10-07', '2026-10-14', '2026-10-21']);
  });

  it('weekly with weekdays starting mid-week skips earlier days of the first week', () => {
    const t = task({ date: '2026-10-07', recurrence: { freq: 'weekly', interval: 1, weekdays: [1, 5] } });
    expect(occurrencesBetween(t, '2026-10-05', '2026-10-12')).toEqual(['2026-10-09', '2026-10-12']);
  });

  it('monthly skips months without that day; yearly handles dates', () => {
    const m = task({ date: '2026-01-31', recurrence: { freq: 'monthly', interval: 1 } });
    expect(occurrencesBetween(m, '2026-01-01', '2026-05-31')).toEqual(['2026-01-31', '2026-03-31', '2026-05-31']);
    const y = task({ date: '2026-03-08', recurrence: { freq: 'yearly', interval: 1 } });
    expect(occursOn(y, '2027-03-08')).toBe(true);
    expect(occursOn(y, '2027-03-09')).toBe(false);
  });

  it('respects until and skippedDates', () => {
    const t = task({
      date: '2026-10-05',
      recurrence: { freq: 'daily', interval: 1, until: '2026-10-08' },
      skippedDates: ['2026-10-06'],
    });
    expect(occurrencesBetween(t, '2026-10-01', '2026-10-31')).toEqual(['2026-10-05', '2026-10-07', '2026-10-08']);
    expect(occursOn(t, '2026-10-09')).toBe(false);
  });

  it('describes rules in Russian', () => {
    expect(describeRecurrence({ freq: 'daily', interval: 1 }, '2026-10-05')).toBe('Каждый день');
    expect(describeRecurrence({ freq: 'daily', interval: 3 }, '2026-10-05')).toBe('Каждые 3 дня');
    expect(describeRecurrence({ freq: 'weekly', interval: 1, weekdays: [1, 3, 5] }, '2026-10-05')).toBe('Каждую неделю: пн, ср, пт');
    expect(describeRecurrence({ freq: 'weekly', interval: 2 }, '2026-10-06')).toBe('Каждые 2 недели: вт');
    expect(describeRecurrence({ freq: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5] }, '2026-10-05')).toBe('По будням');
    expect(describeRecurrence({ freq: 'monthly', interval: 1 }, '2026-10-05')).toBe('Каждый месяц, 5 числа');
    expect(describeRecurrence({ freq: 'yearly', interval: 1 }, '2026-10-05')).toBe('Каждый год, 5 октября');
    expect(describeRecurrence({ freq: 'monthly', interval: 5 }, '2026-10-05')).toBe('Каждые 5 месяцев, 5 числа');
  });
});
