import { addDays, toISODate } from './dates';
import { occurrencesBetween } from './recurrence';
import type { AppData, ISODate, Task } from './types';

export interface DueReminder {
  task: Task;
  date: ISODate;
  fireAt: number;
}

/**
 * Напоминания, момент срабатывания которых попадает в (sinceMs, nowMs].
 * Учитывает повторы, выполненные вхождения не напоминаются.
 */
export function dueReminders(data: AppData, sinceMs: number, nowMs: number): DueReminder[] {
  if (nowMs <= sinceMs) return [];
  // напоминание может быть за много минут до события: берём запас в 2 дня вперёд и 1 назад
  const from = addDays(toISODate(new Date(sinceMs)), -1);
  const to = addDays(toISODate(new Date(nowMs)), 2);
  const out: DueReminder[] = [];
  for (const task of data.tasks) {
    if (task.reminder === null || !task.time || task.date === null) continue;
    const [h, mi] = task.time.split(':').map(Number);
    for (const date of occurrencesBetween(task, from, to)) {
      const done = task.recurrence ? task.completedDates.includes(date) : task.done;
      if (done) continue;
      const [y, m, d] = date.split('-').map(Number);
      const fireAt = new Date(y, m - 1, d, h, mi).getTime() - task.reminder * 60000;
      if (fireAt > sinceMs && fireAt <= nowMs) out.push({ task, date, fireAt });
    }
  }
  return out.sort((a, b) => a.fireAt - b.fireAt);
}
