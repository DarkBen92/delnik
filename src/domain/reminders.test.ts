import { dueReminders } from './reminders';
import { data, task } from './fixtures';

const at = (iso: string, hm: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi).getTime();
};

describe('dueReminders', () => {
  it('returns reminders in (since, now]', () => {
    const d = data([
      task({ id: 'a', date: '2026-10-05', time: '10:00', reminder: 15 }),
      task({ id: 'b', date: '2026-10-05', time: '10:00', reminder: null }),
      task({ id: 'c', date: '2026-10-05', time: '10:00', reminder: 0, done: true }),
      task({ id: 'd', date: '2026-10-05', time: '12:00', reminder: 0 }),
    ]);
    const r = dueReminders(d, at('2026-10-05', '09:40'), at('2026-10-05', '09:50'));
    expect(r.map((x) => x.task.id)).toEqual(['a']);
    expect(r[0]).toMatchObject({ date: '2026-10-05', fireAt: at('2026-10-05', '09:45') });
    expect(dueReminders(d, at('2026-10-05', '09:45'), at('2026-10-05', '09:50'))).toHaveLength(0);
  });

  it('handles recurring tasks and completed occurrences', () => {
    const d = data([
      task({ id: 'r', date: '2026-10-01', time: '08:00', reminder: 0, recurrence: { freq: 'daily', interval: 1 }, completedDates: ['2026-10-06'] }),
    ]);
    expect(dueReminders(d, at('2026-10-05', '07:00'), at('2026-10-05', '09:00')).map((x) => x.date)).toEqual(['2026-10-05']);
    expect(dueReminders(d, at('2026-10-06', '07:00'), at('2026-10-06', '09:00'))).toHaveLength(0);
  });

  it('can fire a reminder for tomorrow early morning from late today', () => {
    const d = data([task({ date: '2026-10-06', time: '00:10', reminder: 30 })]);
    expect(dueReminders(d, at('2026-10-05', '23:30'), at('2026-10-05', '23:45'))).toHaveLength(1);
  });
});
