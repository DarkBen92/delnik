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
export function dueReminders(_data: AppData, _sinceMs: number, _nowMs: number): DueReminder[] {
  throw new Error('not implemented');
}
