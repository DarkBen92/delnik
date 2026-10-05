import {
  addCalendar, addList, addTask, createDefaultData, deleteCalendar, deleteList, deleteTask, moveTask,
  rolloverTasks, searchTasks, setSticker, skipOccurrence, tasksForDay, tasksForList, toggleDone,
  updateTask, weekStats, renameCalendar, renameList,
} from './tasks';
import { data, task } from './fixtures';

const titles = (d: ReturnType<typeof data>, day: string) => tasksForDay(d, 'cal', day).map((o) => o.task.title);

describe('default data', () => {
  it('has one Russian calendar, one someday list and sane settings', () => {
    const d = createDefaultData();
    expect(d.schemaVersion).toBe(1);
    expect(d.calendars).toHaveLength(1);
    expect(d.calendars[0].name).toBe('Личное');
    expect(d.lists.map((l) => l.title)).toEqual(['Когда-нибудь']);
    expect(d.lists[0].calendarId).toBe(d.calendars[0].id);
    expect(d.settings).toMatchObject({
      theme: 'system', view: 'week', showCompleted: true, autoRollover: false, showHolidays: true,
      activeCalendarId: d.calendars[0].id,
    });
  });
});

describe('task CRUD', () => {
  it('adds tasks at the end of a day and of a list', () => {
    let d = data();
    d = addTask(d, { calendarId: 'cal', title: 'А', date: '2026-10-05' }).data;
    d = addTask(d, { calendarId: 'cal', title: 'Б', date: '2026-10-05' }).data;
    const r = addTask(d, { calendarId: 'cal', title: 'В', listId: 'list' });
    d = r.data;
    expect(titles(d, '2026-10-05')).toEqual(['А', 'Б']);
    expect(tasksForList(d, 'list').map((t) => t.title)).toEqual(['В']);
    expect(r.task).toMatchObject({ date: null, listId: 'list', done: false, color: 'none', subtasks: [] });
    expect(r.task.id).toBeTruthy();
  });

  it('updates and deletes without mutating input', () => {
    const d = data([task({ id: 'x', title: 'old' })]);
    const u = updateTask(d, 'x', { title: 'new', color: 'red' });
    expect(u.tasks[0]).toMatchObject({ title: 'new', color: 'red' });
    expect(d.tasks[0].title).toBe('old');
    expect(deleteTask(u, 'x').tasks).toHaveLength(0);
  });

  it('toggles done for plain and recurring tasks', () => {
    let d = data([
      task({ id: 'p' }),
      task({ id: 'r', recurrence: { freq: 'daily', interval: 1 } }),
    ]);
    d = toggleDone(d, 'p');
    expect(d.tasks.find((t) => t.id === 'p')!.done).toBe(true);
    d = toggleDone(d, 'r', '2026-10-06');
    expect(d.tasks.find((t) => t.id === 'r')!.completedDates).toEqual(['2026-10-06']);
    const occ = tasksForDay(d, 'cal', '2026-10-06').find((o) => o.task.id === 'r')!;
    expect(occ).toMatchObject({ done: true, recurring: true, date: '2026-10-06' });
    expect(tasksForDay(d, 'cal', '2026-10-07').find((o) => o.task.id === 'r')!.done).toBe(false);
    d = toggleDone(d, 'r', '2026-10-06');
    expect(d.tasks.find((t) => t.id === 'r')!.completedDates).toEqual([]);
  });

  it('skips one occurrence of a series', () => {
    let d = data([task({ id: 'r', recurrence: { freq: 'daily', interval: 1 } })]);
    d = skipOccurrence(d, 'r', '2026-10-06');
    expect(tasksForDay(d, 'cal', '2026-10-06')).toHaveLength(0);
    expect(tasksForDay(d, 'cal', '2026-10-07')).toHaveLength(1);
  });

  it('only returns tasks of the requested calendar', () => {
    const d = data([task({ calendarId: 'other' }), task({ title: 'mine' })]);
    expect(titles(d, '2026-10-05')).toEqual(['mine']);
  });
});

describe('moveTask', () => {
  it('reorders within a day', () => {
    let d = data([task({ id: 'a', title: 'a', order: 0 }), task({ id: 'b', title: 'b', order: 1 }), task({ id: 'c', title: 'c', order: 2 })]);
    d = moveTask(d, 'c', { date: '2026-10-05' }, 0);
    expect(titles(d, '2026-10-05')).toEqual(['c', 'a', 'b']);
    d = moveTask(d, 'c', { date: '2026-10-05' }, 2);
    expect(titles(d, '2026-10-05')).toEqual(['a', 'b', 'c']);
  });

  it('moves between days and into lists', () => {
    let d = data([task({ id: 'a', title: 'a', order: 0 }), task({ id: 'b', title: 'b', date: '2026-10-06', order: 0 })]);
    d = moveTask(d, 'a', { date: '2026-10-06' }, 0);
    expect(titles(d, '2026-10-05')).toEqual([]);
    expect(titles(d, '2026-10-06')).toEqual(['a', 'b']);
    d = moveTask(d, 'b', { listId: 'list' });
    expect(d.tasks.find((t) => t.id === 'b')).toMatchObject({ date: null, listId: 'list' });
    d = moveTask(d, 'b', { date: '2026-10-12' });
    expect(d.tasks.find((t) => t.id === 'b')).toMatchObject({ date: '2026-10-12', listId: null });
  });

  it('detaches a single occurrence of a recurring task', () => {
    let d = data([task({ id: 'r', title: 'r', recurrence: { freq: 'daily', interval: 1 } })]);
    d = moveTask(d, 'r', { date: '2026-10-09' }, undefined, '2026-10-06');
    expect(titles(d, '2026-10-06')).toEqual([]);
    const day9 = tasksForDay(d, 'cal', '2026-10-09');
    expect(day9).toHaveLength(2);
    const detached = day9.find((o) => !o.recurring)!;
    expect(detached.task).toMatchObject({ title: 'r', recurrence: null, date: '2026-10-09' });
    expect(detached.task.id).not.toBe('r');
  });

  it('moves the series start when no occurrence is given', () => {
    let d = data([task({ id: 'r', recurrence: { freq: 'daily', interval: 1 } })]);
    d = moveTask(d, 'r', { date: '2026-10-08' });
    expect(tasksForDay(d, 'cal', '2026-10-07')).toHaveLength(0);
    expect(tasksForDay(d, 'cal', '2026-10-08')).toHaveLength(1);
  });
});

describe('rollover', () => {
  it('moves undone past non-recurring dated tasks to today', () => {
    const d = data([
      task({ id: 'old', date: '2026-10-01' }),
      task({ id: 'olddone', date: '2026-10-01', done: true }),
      task({ id: 'future', date: '2026-10-10' }),
      task({ id: 'rec', date: '2026-10-01', recurrence: { freq: 'daily', interval: 1 } }),
      task({ id: 'inlist', date: null, listId: 'list' }),
    ]);
    const r = rolloverTasks(d, '2026-10-05');
    expect(r.moved).toBe(1);
    const byId = Object.fromEntries(r.data.tasks.map((t) => [t.id, t]));
    expect(byId.old.date).toBe('2026-10-05');
    expect(byId.olddone.date).toBe('2026-10-01');
    expect(byId.future.date).toBe('2026-10-10');
    expect(byId.rec.date).toBe('2026-10-01');
  });
});

describe('search', () => {
  it('matches title, note and subtasks ignoring case and ё', () => {
    const d = data([
      task({ id: 'a', title: 'Купить Ёлку' }),
      task({ id: 'b', title: 'x', note: 'позвонить в банк' }),
      task({ id: 'c', title: 'y', subtasks: [{ id: 's', title: 'Елочные игрушки', done: false }] }),
      task({ id: 'd', title: 'ёлка', calendarId: 'other' }),
    ]);
    expect(searchTasks(d, 'елк', 'cal').map((t) => t.id)).toEqual(['a']);
    expect(searchTasks(d, 'ёлоч').map((t) => t.id)).toEqual(['c']);
    expect(searchTasks(d, 'БАНК').map((t) => t.id)).toEqual(['b']);
    expect(searchTasks(d, '  ')).toEqual([]);
  });
});

describe('weekStats', () => {
  it('counts tasks per day including recurring occurrences and computes streak', () => {
    const d = data([
      task({ date: '2026-10-05', done: true }),
      task({ date: '2026-10-05', done: true }),
      task({ date: '2026-10-06', done: false }),
      task({ date: '2026-10-07', done: true, recurrence: { freq: 'daily', interval: 1, until: '2026-10-08' }, completedDates: ['2026-10-07', '2026-10-08'] }),
    ]);
    const s = weekStats(d, 'cal', '2026-10-05', '2026-10-08');
    expect(s.total).toBe(5);
    expect(s.done).toBe(4);
    expect(s.byDay[0]).toEqual({ date: '2026-10-05', total: 2, done: 2 });
    expect(s.byDay[1]).toEqual({ date: '2026-10-06', total: 1, done: 0 });
    expect(s.byDay).toHaveLength(7);
    // 7 и 8 октября всё сделано, 6 — нет → серия 2
    expect(s.streak).toBe(2);
  });
});

describe('calendars, lists, stickers', () => {
  it('adds, renames, deletes calendars but never the last one', () => {
    let d = data([task({ calendarId: 'cal' })]);
    const r = addCalendar(d, 'Работа');
    d = renameCalendar(r.data, r.id, 'Работа 2');
    expect(d.calendars.map((c) => c.name)).toEqual(['Личное', 'Работа 2']);
    expect(d.lists.filter((l) => l.calendarId === r.id)).toHaveLength(1);
    d = { ...d, settings: { ...d.settings, activeCalendarId: 'cal' } };
    d = deleteCalendar(d, 'cal');
    expect(d.calendars.map((c) => c.id)).toEqual([r.id]);
    expect(d.tasks).toHaveLength(0);
    expect(d.lists.every((l) => l.calendarId === r.id)).toBe(true);
    expect(d.settings.activeCalendarId).toBe(r.id);
    expect(deleteCalendar(d, r.id)).toBe(d);
  });

  it('manages lists with their tasks', () => {
    let d = data([task({ date: null, listId: 'list' })]);
    const r = addList(d, 'cal', 'Книги');
    d = renameList(r.data, r.id, 'Прочитать');
    expect(d.lists.map((l) => l.title)).toEqual(['Когда-нибудь', 'Прочитать']);
    d = deleteList(d, 'list');
    expect(d.lists.map((l) => l.id)).toEqual([r.id]);
    expect(d.tasks).toHaveLength(0);
  });

  it('sets and clears stickers', () => {
    let d = setSticker(data(), 'cal', '2026-10-05', '🎉');
    expect(d.calendars[0].stickers).toEqual({ '2026-10-05': '🎉' });
    d = setSticker(d, 'cal', '2026-10-05', null);
    expect(d.calendars[0].stickers).toEqual({});
  });
});
