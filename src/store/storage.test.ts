import { data, task } from '../domain/fixtures';
import { STORAGE_KEY, loadData, normalize } from './storage';

describe('storage: тэги', () => {
  it('старые данные без тэгов загружаются с пустым списком и tagId = null', () => {
    const old = data([task({ id: 'a' })]) as unknown as Record<string, unknown>;
    delete old.tags;
    const tasks = (old.tasks as Record<string, unknown>[]).map(({ tagId: _t, ...t }) => t);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...old, tasks }));
    const d = loadData();
    expect(d.tags).toEqual([]);
    expect(d.tasks[0].tagId).toBeNull();
  });

  it('висячий tagId обнуляется, существующий сохраняется', () => {
    const d = normalize({
      ...data([task({ id: 'a', tagId: 'gone' }), task({ id: 'b', tagId: 's' })]),
      tags: [{ id: 's', name: 'Спорт', color: 'yellow' }],
    });
    expect(d.tasks.map((t) => t.tagId)).toEqual([null, 's']);
  });
});
