import type {
  AppData, ISODate, Task, TaskOccurrence, WeekStats,
} from './types';

const NI = (): never => {
  throw new Error('not implemented');
};

/** Календарь «Личное», список «Когда-нибудь», настройки по умолчанию. */
export function createDefaultData(): AppData { return NI(); }

export type NewTask = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> &
  Pick<Task, 'calendarId' | 'title'> & ({ date: ISODate; listId?: null } | { listId: string; date?: null });

/** Добавляет в конец дня/списка. */
export function addTask(_data: AppData, _t: NewTask): { data: AppData; task: Task } { return NI(); }
export function updateTask(_data: AppData, _id: string, _patch: Partial<Task>): AppData { return NI(); }
export function deleteTask(_data: AppData, _id: string): AppData { return NI(); }
/** Для повторяющейся задачи переключает вхождение `date`. */
export function toggleDone(_data: AppData, _id: string, _date?: ISODate): AppData { return NI(); }
/** Убирает одно вхождение повторяющейся задачи. */
export function skipOccurrence(_data: AppData, _id: string, _date: ISODate): AppData { return NI(); }

export type MoveTarget = { date: ISODate } | { listId: string };
/**
 * Перемещает задачу в день/список на позицию `index` (по умолчанию в конец), пересчитывая order.
 * Если задача повторяющаяся и задан `occurrenceDate`, вхождение отсоединяется в новую
 * неповторяющуюся задачу (а дата добавляется в skippedDates серии).
 * Если повторяющаяся без `occurrenceDate` и цель — день, серия начинается с новой даты.
 */
export function moveTask(
  _data: AppData, _id: string, _target: MoveTarget, _index?: number, _occurrenceDate?: ISODate,
): AppData { return NI(); }

/** Вхождения задач календаря в день, по order. */
export function tasksForDay(_data: AppData, _calendarId: string, _day: ISODate): TaskOccurrence[] { return NI(); }
export function tasksForList(_data: AppData, _listId: string): Task[] { return NI(); }

/** Невыполненные неповторяющиеся задачи с датой < today переносятся на today. */
export function rolloverTasks(_data: AppData, _today: ISODate): { data: AppData; moved: number } { return NI(); }

/** Поиск без учёта регистра и ё/е по названию, заметке и подзадачам. */
export function searchTasks(_data: AppData, _query: string, _calendarId?: string): Task[] { return NI(); }

export function weekStats(_data: AppData, _calendarId: string, _weekStart: ISODate, _today: ISODate): WeekStats { return NI(); }

export function addCalendar(_data: AppData, _name: string, _color?: string): { data: AppData; id: string } { return NI(); }
export function renameCalendar(_data: AppData, _id: string, _name: string): AppData { return NI(); }
/** Последний календарь удалить нельзя (возвращает data без изменений). Удаляет задачи и списки календаря. */
export function deleteCalendar(_data: AppData, _id: string): AppData { return NI(); }
export function addList(_data: AppData, _calendarId: string, _title: string): { data: AppData; id: string } { return NI(); }
export function renameList(_data: AppData, _id: string, _title: string): AppData { return NI(); }
/** Удаляет список вместе с его задачами. */
export function deleteList(_data: AppData, _id: string): AppData { return NI(); }
/** emoji === null — убрать стикер. */
export function setSticker(_data: AppData, _calendarId: string, _day: ISODate, _emoji: string | null): AppData { return NI(); }
