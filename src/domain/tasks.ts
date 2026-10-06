import { weekDates } from './dates';
import { makeId } from './ids';
import { occursOn } from './recurrence';
import type {
  AppData, Calendar, ISODate, Task, TaskOccurrence, WeekStats,
} from './types';

const CAL_COLORS = ['#4f9d69', '#4a86c5', '#d9822b', '#9b59b6', '#c0504d', '#3aa6a6'];

/** Календарь «Личное», список «Когда-нибудь», настройки по умолчанию. */
export function createDefaultData(): AppData {
  const calendarId = makeId();
  return {
    schemaVersion: 1,
    calendars: [{ id: calendarId, name: 'Личное', color: CAL_COLORS[0], stickers: {} }],
    lists: [{ id: makeId(), calendarId, title: 'Когда-нибудь', order: 0 }],
    tasks: [],
    settings: {
      theme: 'system',
      customTheme: null,
      showCompleted: true,
      autoRollover: false,
      showHolidays: true,
      notifications: false,
      view: 'week',
      activeCalendarId: calendarId,
      lastRolloverDate: null,
    },
  };
}

export type NewTask = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> &
  Pick<Task, 'calendarId' | 'title'> & ({ date: ISODate; listId?: null } | { listId: string; date?: null });

type Bucket = { date: ISODate } | { listId: string };

const inBucket = (t: Task, calendarId: string, b: Bucket): boolean =>
  'date' in b
    ? t.calendarId === calendarId && t.date === b.date
    : t.listId === b.listId;

const byOrder = (a: Task, b: Task): number => a.order - b.order || a.createdAt - b.createdAt;

/** Пересчитывает order 0..n-1 в корзине (в текущем порядке сортировки). */
function renumber(tasks: Task[], calendarId: string, b: Bucket): Task[] {
  const ids = tasks.filter((t) => inBucket(t, calendarId, b)).sort(byOrder).map((t) => t.id);
  const pos = new Map(ids.map((id, i) => [id, i]));
  return tasks.map((t) => (pos.has(t.id) && t.order !== pos.get(t.id) ? { ...t, order: pos.get(t.id)! } : t));
}

const bucketOf = (t: Task): Bucket => (t.listId !== null ? { listId: t.listId } : { date: t.date as ISODate });

const replaceTask = (data: AppData, id: string, fn: (t: Task) => Task): AppData => ({
  ...data,
  tasks: data.tasks.map((t) => (t.id === id ? fn(t) : t)),
});

/** Добавляет в конец дня/списка. */
export function addTask(data: AppData, t: NewTask): { data: AppData; task: Task } {
  const now = Date.now();
  const date = t.date ?? null;
  const listId = date === null ? t.listId ?? null : null;
  const bucket: Bucket = date !== null ? { date } : { listId: listId as string };
  const order = data.tasks.filter((x) => inBucket(x, t.calendarId, bucket)).length;
  const task: Task = {
    note: '',
    done: false,
    color: 'none',
    time: null,
    reminder: null,
    recurrence: null,
    completedDates: [],
    skippedDates: [],
    subtasks: [],
    attachments: [],
    ...t,
    id: makeId(),
    date,
    listId,
    order,
    createdAt: now,
    updatedAt: now,
  };
  return { data: { ...data, tasks: [...data.tasks, task] }, task };
}

export function updateTask(data: AppData, id: string, patch: Partial<Task>): AppData {
  const { id: _id, createdAt: _c, ...rest } = patch;
  return replaceTask(data, id, (t) => ({ ...t, ...rest, updatedAt: Date.now() }));
}

export function deleteTask(data: AppData, id: string): AppData {
  return { ...data, tasks: data.tasks.filter((t) => t.id !== id) };
}

/** Для повторяющейся задачи переключает вхождение `date`. */
export function toggleDone(data: AppData, id: string, date?: ISODate): AppData {
  return replaceTask(data, id, (t) => {
    if (!t.recurrence) return { ...t, done: !t.done, updatedAt: Date.now() };
    const day = date ?? t.date;
    if (!day) return t;
    const completedDates = t.completedDates.includes(day)
      ? t.completedDates.filter((d) => d !== day)
      : [...t.completedDates, day].sort();
    return { ...t, completedDates, updatedAt: Date.now() };
  });
}

/** Убирает одно вхождение повторяющейся задачи. */
export function skipOccurrence(data: AppData, id: string, date: ISODate): AppData {
  return replaceTask(data, id, (t) => (t.skippedDates.includes(date)
    ? t
    : { ...t, skippedDates: [...t.skippedDates, date].sort(), updatedAt: Date.now() }));
}

export type MoveTarget = { date: ISODate } | { listId: string };
/**
 * Перемещает задачу в день/список на позицию `index` (по умолчанию в конец), пересчитывая order.
 * Если задача повторяющаяся и задан `occurrenceDate`, вхождение отсоединяется в новую
 * неповторяющуюся задачу (а дата добавляется в skippedDates серии).
 * Если повторяющаяся без `occurrenceDate` и цель — день, серия начинается с новой даты.
 */
export function moveTask(
  data: AppData, id: string, target: MoveTarget, index?: number, occurrenceDate?: ISODate,
): AppData {
  const src = data.tasks.find((t) => t.id === id);
  if (!src) return data;
  const now = Date.now();
  const targetList = 'listId' in target ? data.lists.find((l) => l.id === target.listId) : undefined;
  const calendarId = targetList ? targetList.calendarId : src.calendarId;
  const placement = 'date' in target
    ? { date: target.date, listId: null }
    : { date: null, listId: target.listId };

  let tasks = data.tasks;
  let moved: Task;
  if (src.recurrence && occurrenceDate) {
    moved = {
      ...src,
      ...placement,
      calendarId,
      id: makeId(),
      recurrence: null,
      done: src.completedDates.includes(occurrenceDate),
      completedDates: [],
      skippedDates: [],
      createdAt: now,
      updatedAt: now,
    };
    tasks = tasks.map((t) => (t.id === id && !t.skippedDates.includes(occurrenceDate)
      ? { ...t, skippedDates: [...t.skippedDates, occurrenceDate].sort(), updatedAt: now }
      : t));
  } else {
    moved = {
      ...src,
      ...placement,
      calendarId,
      recurrence: 'listId' in target ? null : src.recurrence,
      updatedAt: now,
    };
    tasks = tasks.filter((t) => t.id !== id);
  }

  const targetBucket: Bucket = 'date' in target ? { date: target.date } : { listId: target.listId };
  const siblings = tasks.filter((t) => inBucket(t, calendarId, targetBucket)).sort(byOrder);
  const at = Math.max(0, Math.min(index ?? siblings.length, siblings.length));
  const orderOf = new Map<string, number>();
  const sequence = [...siblings.slice(0, at), moved, ...siblings.slice(at)];
  sequence.forEach((t, i) => orderOf.set(t.id, i));
  const placed = tasks.map((t) => (orderOf.has(t.id) ? { ...t, order: orderOf.get(t.id)! } : t));
  placed.push({ ...moved, order: orderOf.get(moved.id)! });

  // уплотняем исходную корзину
  let result = placed;
  if (src.date !== null || src.listId !== null) {
    result = renumber(result, src.calendarId, bucketOf(src));
  }
  return { ...data, tasks: result };
}

/** Вхождения задач календаря в день, по order. */
export function tasksForDay(data: AppData, calendarId: string, day: ISODate): TaskOccurrence[] {
  return data.tasks
    .filter((t) => t.calendarId === calendarId && occursOn(t, day))
    .sort(byOrder)
    .map((task) => ({
      task,
      date: day,
      recurring: task.recurrence !== null,
      done: task.recurrence ? task.completedDates.includes(day) : task.done,
    }));
}

export function tasksForList(data: AppData, listId: string): Task[] {
  return data.tasks.filter((t) => t.listId === listId).sort(byOrder);
}

/** Невыполненные неповторяющиеся задачи с датой < today переносятся на today. */
export function rolloverTasks(data: AppData, today: ISODate): { data: AppData; moved: number } {
  const stale = data.tasks
    .filter((t) => !t.recurrence && !t.done && t.date !== null && t.date < today)
    .sort((a, b) => (a.date as string).localeCompare(b.date as string) || a.order - b.order);
  if (stale.length === 0) return { data, moved: 0 };
  const next = new Map<string, number>();
  const orders = new Map<string, number>();
  for (const t of stale) {
    const key = t.calendarId;
    if (!next.has(key)) {
      next.set(key, data.tasks.filter((x) => x.calendarId === key && x.date === today).length);
    }
    const o = next.get(key)!;
    orders.set(t.id, o);
    next.set(key, o + 1);
  }
  const now = Date.now();
  return {
    moved: stale.length,
    data: {
      ...data,
      tasks: data.tasks.map((t) => (orders.has(t.id)
        ? { ...t, date: today, order: orders.get(t.id)!, updatedAt: now }
        : t)),
    },
  };
}

const norm = (s: string): string => s.toLowerCase().replace(/ё/g, 'е');

/** Поиск без учёта регистра и ё/е по названию, заметке и подзадачам. */
export function searchTasks(data: AppData, query: string, calendarId?: string): Task[] {
  const q = norm(query.trim());
  if (!q) return [];
  return data.tasks.filter((t) => {
    if (calendarId && t.calendarId !== calendarId) return false;
    return norm(t.title).includes(q) || norm(t.note).includes(q)
      || t.subtasks.some((s) => norm(s.title).includes(q));
  });
}

export function weekStats(data: AppData, calendarId: string, weekStart: ISODate, today: ISODate): WeekStats {
  const days = weekDates(weekStart);
  const byDay = days.map((date) => {
    const occ = tasksForDay(data, calendarId, date);
    return { date, total: occ.length, done: occ.filter((o) => o.done).length };
  });
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const d = byDay[i];
    if (d.date > today) continue;
    const complete = d.total > 0 && d.done === d.total;
    if (complete) streak += 1;
    else if (d.date === today && d.total > 0) continue; // сегодня ещё не закончился
    else break;
  }
  return {
    total: byDay.reduce((s, d) => s + d.total, 0),
    done: byDay.reduce((s, d) => s + d.done, 0),
    byDay,
    streak,
  };
}

export function addCalendar(data: AppData, name: string, color?: string): { data: AppData; id: string } {
  const id = makeId();
  const calendar: Calendar = {
    id, name, color: color ?? CAL_COLORS[data.calendars.length % CAL_COLORS.length], stickers: {},
  };
  return {
    id,
    data: {
      ...data,
      calendars: [...data.calendars, calendar],
      lists: [...data.lists, { id: makeId(), calendarId: id, title: 'Когда-нибудь', order: 0 }],
    },
  };
}

export function renameCalendar(data: AppData, id: string, name: string): AppData {
  return { ...data, calendars: data.calendars.map((c) => (c.id === id ? { ...c, name } : c)) };
}

/** Последний календарь удалить нельзя (возвращает data без изменений). Удаляет задачи и списки календаря. */
export function deleteCalendar(data: AppData, id: string): AppData {
  if (data.calendars.length <= 1 || !data.calendars.some((c) => c.id === id)) return data;
  const calendars = data.calendars.filter((c) => c.id !== id);
  return {
    ...data,
    calendars,
    lists: data.lists.filter((l) => l.calendarId !== id),
    tasks: data.tasks.filter((t) => t.calendarId !== id),
    settings: data.settings.activeCalendarId === id
      ? { ...data.settings, activeCalendarId: calendars[0].id }
      : data.settings,
  };
}

export function addList(data: AppData, calendarId: string, title: string): { data: AppData; id: string } {
  const id = makeId();
  const order = data.lists.filter((l) => l.calendarId === calendarId).length;
  return { id, data: { ...data, lists: [...data.lists, { id, calendarId, title, order }] } };
}

export function renameList(data: AppData, id: string, title: string): AppData {
  return { ...data, lists: data.lists.map((l) => (l.id === id ? { ...l, title } : l)) };
}

/** Удаляет список вместе с его задачами. */
export function deleteList(data: AppData, id: string): AppData {
  return {
    ...data,
    lists: data.lists.filter((l) => l.id !== id),
    tasks: data.tasks.filter((t) => t.listId !== id),
  };
}

/** emoji === null — убрать стикер. */
export function setSticker(data: AppData, calendarId: string, day: ISODate, emoji: string | null): AppData {
  return {
    ...data,
    calendars: data.calendars.map((c) => {
      if (c.id !== calendarId) return c;
      const stickers = { ...c.stickers };
      if (emoji === null) delete stickers[day];
      else stickers[day] = emoji;
      return { ...c, stickers };
    }),
  };
}
