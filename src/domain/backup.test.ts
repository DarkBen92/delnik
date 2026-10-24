import { decodeShare, encodeShare, importSnapshot, parseBackup, serializeBackup, snapshotCalendar } from './backup';
import { data, task } from './fixtures';

describe('backup', () => {
  it('round-trips data', () => {
    const d = data([task({ title: 'Привет 👋' })]);
    const text = serializeBackup(d);
    expect(JSON.parse(text)).toMatchObject({ app: 'delnik', schemaVersion: 1 });
    expect(parseBackup(text)).toEqual(d);
  });

  it('rejects foreign files with a Russian message', () => {
    expect(() => parseBackup('not json')).toThrow(/резервн/i);
    expect(() => parseBackup('{"app":"other"}')).toThrow(/резервн/i);
    expect(() => parseBackup(JSON.stringify({ app: 'delnik', schemaVersion: 99, data: {} }))).toThrow(/верси/i);
  });
});

describe('share link', () => {
  it('encodes URL-safe and imports as a new calendar with new ids', () => {
    const d = data([
      task({ id: 'a', title: 'Кириллица и 🎉', date: '2026-10-05', attachments: [{ id: 'f', name: 'x.pdf', size: 1, type: 'application/pdf' }] }),
      task({ id: 'b', title: 'В списке', date: null, listId: 'list' }),
      task({ id: 'c', title: 'Чужое', calendarId: 'other' }),
    ]);
    const snap = snapshotCalendar(d, 'cal');
    expect(snap.tasks.map((t) => t.id).sort()).toEqual(['a', 'b']);
    const code = encodeShare(snap);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    const back = decodeShare(code);
    expect(back).toEqual(snap);

    const r = importSnapshot(d, back);
    expect(r.data.calendars).toHaveLength(2);
    const newCal = r.data.calendars.find((c) => c.id === r.calendarId)!;
    expect(newCal.id).not.toBe('cal');
    expect(newCal.name).toBe('Личное');
    const imported = r.data.tasks.filter((t) => t.calendarId === r.calendarId);
    expect(imported).toHaveLength(2);
    expect(imported.every((t) => !['a', 'b'].includes(t.id))).toBe(true);
    expect(imported.find((t) => t.title === 'Кириллица и 🎉')!.attachments).toEqual([]);
    const newList = r.data.lists.find((l) => l.calendarId === r.calendarId)!;
    expect(imported.find((t) => t.title === 'В списке')!.listId).toBe(newList.id);
  });

  it('carries used tags and merges them by name on import', () => {
    const d = {
      ...data([
        task({ id: 'a', tagId: 'sport' }),
        task({ id: 'b', tagId: 'work' }),
        task({ id: 'c', tagId: 'other-only', calendarId: 'other' }),
      ]),
      tags: [
        { id: 'sport', name: 'Спорт', color: 'yellow' as const },
        { id: 'work', name: 'Работа', color: 'blue' as const },
        { id: 'other-only', name: 'Чужой', color: 'red' as const },
      ],
    };
    const snap = snapshotCalendar(d, 'cal');
    expect(snap.tags!.map((t) => t.name).sort()).toEqual(['Работа', 'Спорт']);

    const target = { ...data(), tags: [{ id: 'mine', name: 'спорт', color: 'green' as const }] };
    const r = importSnapshot(target, decodeShare(encodeShare(snap)));
    expect(r.data.tags.map((t) => t.name).sort()).toEqual(['Работа', 'спорт']);
    const imported = r.data.tasks.filter((t) => t.calendarId === r.calendarId);
    const work = r.data.tags.find((t) => t.name === 'Работа')!;
    expect(work.color).toBe('blue');
    expect(imported.map((t) => t.tagId).sort()).toEqual(['mine', work.id].sort());
  });

  it('opens old links without tags', () => {
    const snap = snapshotCalendar(data([task({ id: 'a' })]), 'cal');
    delete (snap as { tags?: unknown }).tags;
    const r = importSnapshot(data(), snap);
    expect(r.data.tags).toEqual([]);
    expect(r.data.tasks[0].tagId).toBeNull();
  });

  it('throws on garbage', () => {
    expect(() => decodeShare('%%%')).toThrow();
  });
});
