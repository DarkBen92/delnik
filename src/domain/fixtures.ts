import type { AppData, Task } from './types';
import { createDefaultData } from './tasks';

let n = 0;
export function task(over: Partial<Task> = {}): Task {
  n += 1;
  return {
    id: `t${n}`,
    calendarId: 'cal',
    title: `Задача ${n}`,
    note: '',
    done: false,
    color: 'none',
    date: '2026-10-05',
    listId: null,
    order: n,
    time: null,
    reminder: null,
    recurrence: null,
    completedDates: [],
    skippedDates: [],
    subtasks: [],
    attachments: [],
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

/** Данные с одним календарём `cal` и списком `list`. */
export function data(tasks: Task[] = []): AppData {
  const d = createDefaultData();
  return {
    ...d,
    calendars: [{ id: 'cal', name: 'Личное', color: '#4a7', stickers: {} }],
    lists: [{ id: 'list', calendarId: 'cal', title: 'Когда-нибудь', order: 0 }],
    tasks,
    settings: { ...d.settings, activeCalendarId: 'cal' },
  };
}
