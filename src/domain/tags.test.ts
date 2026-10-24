import { addTag, deleteTag, effectiveColor, findTag, updateTag } from './tags';
import { data, task } from './fixtures';

describe('tags', () => {
  it('creates a trimmed tag, colourless by default', () => {
    const r = addTag(data(), '  Спорт ', 'yellow');
    expect(r.tag).toMatchObject({ name: 'Спорт', color: 'yellow' });
    expect(r.data.tags).toEqual([r.tag]);
    expect(addTag(data(), 'Дом').tag!.color).toBe('none');
  });

  it('reuses a tag with the same name ignoring case and ё/е', () => {
    const a = addTag(data(), 'Ёлка', 'green');
    const b = addTag(a.data, 'елка', 'red');
    expect(b.tag!.id).toBe(a.tag!.id);
    expect(b.data.tags).toHaveLength(1);
    expect(b.tag!.color).toBe('green');
    expect(findTag(b.data, ' ЁЛКА ')?.id).toBe(a.tag!.id);
    expect(findTag(b.data, 'нет такого')).toBeUndefined();
  });

  it('does not create a tag with an empty name', () => {
    const d = data();
    const r = addTag(d, '   ');
    expect(r.tag).toBeNull();
    expect(r.data).toBe(d);
  });

  it('renames and recolours a tag', () => {
    const a = addTag(data(), 'Спорт');
    const d = updateTag(a.data, a.tag!.id, { name: 'Фитнес', color: 'blue' });
    expect(d.tags[0]).toMatchObject({ id: a.tag!.id, name: 'Фитнес', color: 'blue' });
  });

  it('deleting a tag removes it from tasks', () => {
    const a = addTag(data([task({ id: 'x', tagId: null }), task({ id: 'y' })]), 'Спорт', 'yellow');
    const id = a.tag!.id;
    const withTag = { ...a.data, tasks: a.data.tasks.map((t) => ({ ...t, tagId: id })) };
    const d = deleteTag(withTag, id);
    expect(d.tags).toEqual([]);
    expect(d.tasks.map((t) => t.tagId)).toEqual([null, null]);
  });

  it('task colour wins over tag colour', () => {
    const tags = [{ id: 's', name: 'Спорт', color: 'yellow' as const }, { id: 'n', name: 'Без', color: 'none' as const }];
    expect(effectiveColor(task({ color: 'none', tagId: 's' }), tags)).toBe('yellow');
    expect(effectiveColor(task({ color: 'red', tagId: 's' }), tags)).toBe('red');
    expect(effectiveColor(task({ color: 'none', tagId: 'n' }), tags)).toBe('none');
    expect(effectiveColor(task({ color: 'none', tagId: null }), tags)).toBe('none');
    expect(effectiveColor(task({ color: 'none', tagId: 'gone' }), tags)).toBe('none');
  });
});
