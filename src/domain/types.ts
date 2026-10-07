/** Дата в локальном времени в формате `YYYY-MM-DD`. */
export type ISODate = string;
/** Время в формате `HH:mm`. */
export type TimeHM = string;
/** День недели по ISO: 1 = понедельник … 7 = воскресенье. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const TASK_COLORS = ['none', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'] as const;
export type TaskColor = (typeof TASK_COLORS)[number];

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Recurrence {
  freq: RecurrenceFreq;
  /** Каждые N единиц `freq`, N ≥ 1. */
  interval: number;
  /** Только для `weekly`: дни недели. Пусто/не задано — день недели даты начала. */
  weekdays?: Weekday[];
  /** Последняя допустимая дата (включительно). */
  until?: ISODate | null;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface AttachmentMeta {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface Task {
  id: string;
  calendarId: string;
  title: string;
  note: string;
  /** Для неповторяющихся задач. У повторяющихся выполнение хранится в `completedDates`. */
  done: boolean;
  color: TaskColor;
  /** Дата задачи (для повторяющейся — дата начала серии). `null` — задача в списке. */
  date: ISODate | null;
  /** Список «Когда-нибудь». Ровно одно из `date` / `listId` не равно `null`. */
  listId: string | null;
  /** Порядок внутри дня или списка (по возрастанию). */
  order: number;
  time: TimeHM | null;
  /** Напоминание за N минут до `time` (0 — в момент). `null` — без напоминания. */
  reminder: number | null;
  recurrence: Recurrence | null;
  /** Выполненные вхождения повторяющейся задачи. */
  completedDates: ISODate[];
  /** Удалённые/отсоединённые вхождения повторяющейся задачи. */
  skippedDates: ISODate[];
  subtasks: Subtask[];
  attachments: AttachmentMeta[];
  createdAt: number;
  updatedAt: number;
}

export interface SomedayList {
  id: string;
  calendarId: string;
  title: string;
  order: number;
}

export interface Calendar {
  id: string;
  name: string;
  /** Цвет-метка календаря (CSS-цвет). */
  color: string;
  /** Стикеры-эмодзи по датам. */
  stickers: Record<ISODate, string>;
}

/** Свои цвета темы: хранятся только те, что пользователь поменял. */
export interface CustomTheme {
  accent?: string;
  background?: string;
  paper?: string;
  text?: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type ViewMode = 'week' | 'month' | 'day';

export interface Settings {
  theme: ThemeMode;
  /** Свои цвета светлой темы. */
  customTheme: CustomTheme | null;
  /** Свои цвета тёмной темы — отдельно, чтобы светлые цвета не ломали тёмную тему. */
  customThemeDark: CustomTheme | null;
  /** Скрывать выполненные задачи; по умолчанию они остаются зачёркнутыми. */
  hideCompleted: boolean;
  autoRollover: boolean;
  showHolidays: boolean;
  notifications: boolean;
  view: ViewMode;
  activeCalendarId: string;
  /** Дата последнего автопереноса «хвостов». */
  lastRolloverDate: ISODate | null;
}

export interface AppData {
  schemaVersion: 1;
  calendars: Calendar[];
  lists: SomedayList[];
  tasks: Task[];
  settings: Settings;
}

/** Конкретное вхождение задачи в день (для повторяющихся задач — виртуальное). */
export interface TaskOccurrence {
  task: Task;
  date: ISODate;
  done: boolean;
  /** true, если задача повторяющаяся. */
  recurring: boolean;
}

export type DayKind = 'workday' | 'weekend' | 'holiday' | 'shortened';

export interface DayInfo {
  kind: DayKind;
  /** Название праздника, если есть. */
  name?: string;
}

export interface QuickInputResult {
  title: string;
  date: ISODate | null;
  time: TimeHM | null;
  recurrence: Recurrence | null;
  color: TaskColor | null;
}

export interface WeekStats {
  total: number;
  done: number;
  /** 7 элементов Пн–Вс. */
  byDay: { date: ISODate; total: number; done: number }[];
  /** Сколько дней подряд до `today` (включительно, если в нём всё сделано) все задачи выполнены. */
  streak: number;
}

/** Задача, распарсенная из ICS, без служебных полей. */
export type TaskDraft = Pick<Task, 'title' | 'note' | 'date' | 'time' | 'recurrence'>;
