import type { Task, TaskDraft } from './types';

/** VCALENDAR с VEVENT на каждую датированную задачу (задачи из списков пропускаются). */
export function exportICS(_tasks: Task[], _calendarName: string): string {
  throw new Error('not implemented');
}
export function parseICS(_text: string): TaskDraft[] {
  throw new Error('not implemented');
}
