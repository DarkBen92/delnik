import { exportICS, parseICS } from './ics';
import { task } from './fixtures';

describe('ICS', () => {
  it('exports all-day, timed and recurring tasks', () => {
    const ics = exportICS([
      task({ id: 'a', title: 'Весь день; с запятой, да', date: '2026-10-05', note: 'строка1\nстрока2' }),
      task({ id: 'b', title: 'Созвон', date: '2026-10-06', time: '09:30' }),
      task({ id: 'c', title: 'Бассейн', date: '2026-10-07', recurrence: { freq: 'weekly', interval: 2, weekdays: [3, 5], until: '2026-12-31' } }),
      task({ id: 'd', title: 'В списке', date: null, listId: 'list' }),
    ], 'Личное');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('X-WR-CALNAME:Личное');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261005');
    expect(ics).toContain('DTEND;VALUE=DATE:20261006');
    expect(ics).toContain('SUMMARY:Весь день\\; с запятой\\, да');
    expect(ics).toContain('DESCRIPTION:строка1\\nстрока2');
    expect(ics).toContain('DTSTART:20261006T093000');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=WE,FR;UNTIL=20261231');
    expect(ics).not.toContain('В списке');
  });

  it('round-trips through parseICS', () => {
    const t = [
      task({ title: 'Весь день, да', date: '2026-10-05', note: 'a\nb' }),
      task({ title: 'Созвон', date: '2026-10-06', time: '09:30' }),
      task({ title: 'Аренда', date: '2026-10-07', recurrence: { freq: 'monthly', interval: 1 } }),
    ];
    expect(parseICS(exportICS(t, 'x'))).toEqual([
      { title: 'Весь день, да', note: 'a\nb', date: '2026-10-05', time: null, recurrence: null },
      { title: 'Созвон', note: '', date: '2026-10-06', time: '09:30', recurrence: null },
      { title: 'Аренда', note: '', date: '2026-10-07', time: null, recurrence: { freq: 'monthly', interval: 1 } },
    ]);
  });

  it('parses foreign ICS with folding, UTC times and unknown fields', () => {
    const text = [
      'BEGIN:VCALENDAR', 'PRODID:-//Google Inc//Google Calendar 70.9054//EN', 'BEGIN:VEVENT',
      'DTSTART:20261010T150000Z', 'DTEND:20261010T160000Z', 'SUMMARY:Очень длинное назв',
      ' ание события', 'RRULE:FREQ=DAILY;COUNT=5', 'UID:abc@google.com', 'END:VEVENT',
      'BEGIN:VEVENT', 'DTSTART;TZID=Europe/Moscow:20261011T080000', 'SUMMARY:Пробежка', 'END:VEVENT',
      'END:VCALENDAR', '',
    ].join('\r\n');
    const r = parseICS(text);
    expect(r).toHaveLength(2);
    expect(r[0].title).toBe('Очень длинное название события');
    expect(r[0].date).toBe('2026-10-10');
    expect(r[0].time).toMatch(/^\d\d:00$/); // UTC → локальное время
    expect(r[0].recurrence).toEqual({ freq: 'daily', interval: 1, until: '2026-10-14' });
    expect(r[1]).toMatchObject({ title: 'Пробежка', date: '2026-10-11', time: '08:00' });
  });
});
