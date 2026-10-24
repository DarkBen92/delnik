import { makeId } from './ids';
import type { AppData, Tag, Task, TaskColor } from './types';

const key = (name: string): string => name.trim().toLowerCase().replace(/ё/g, 'е');

/** Тэг с таким названием без учёта регистра и ё/е. */
export function findTag(data: Pick<AppData, 'tags'>, name: string): Tag | undefined {
  const k = key(name);
  return data.tags.find((t) => key(t.name) === k);
}

/** Создаёт тэг или возвращает существующий с тем же названием. Пустое название — `tag: null`. */
export function addTag(data: AppData, name: string, color: TaskColor = 'none'): { data: AppData; tag: Tag | null } {
  const title = name.trim();
  if (!title) return { data, tag: null };
  const found = findTag(data, title);
  if (found) return { data, tag: found };
  const tag: Tag = { id: makeId(), name: title, color };
  return { data: { ...data, tags: [...data.tags, tag] }, tag };
}

export function updateTag(data: AppData, id: string, patch: Partial<Pick<Tag, 'name' | 'color'>>): AppData {
  return { ...data, tags: data.tags.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
}

/** Удаляет тэг и снимает его с задач. */
export function deleteTag(data: AppData, id: string): AppData {
  return {
    ...data,
    tags: data.tags.filter((t) => t.id !== id),
    tasks: data.tasks.map((t) => (t.tagId === id ? { ...t, tagId: null } : t)),
  };
}

/** Свой цвет задачи, иначе цвет тэга. */
export function effectiveColor(task: Task, tags: Tag[]): TaskColor {
  if (task.color !== 'none') return task.color;
  return tags.find((t) => t.id === task.tagId)?.color ?? 'none';
}
