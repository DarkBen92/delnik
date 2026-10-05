import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { memo } from 'react';
import type { ISODate, Task } from '../domain/types';
import { toggleDone } from '../domain/tasks';
import { useAppStore } from '../store/store';

export const itemId = (taskId: string, date: ISODate | null) => `t:${taskId}:${date ?? ''}`;

interface RowProps {
  task: Task;
  date: ISODate | null;
  done: boolean;
  recurring: boolean;
  overlay?: boolean;
}

/** Содержимое строки задачи (без dnd-обвязки). */
export function TaskBody({ task, date, done, recurring }: RowProps) {
  const store = useAppStore();
  const subDone = task.subtasks.filter((s) => s.done).length;
  return (
    <>
      <input
        type="checkbox"
        className="task-check"
        aria-label={task.title}
        checked={done}
        onChange={() => store.getState().mutate((d) => toggleDone(d, task.id, recurring ? (date ?? undefined) : undefined))}
      />
      <button
        type="button"
        className="task-open"
        aria-label={`Открыть задачу «${task.title}»`}
        onClick={() => store.getState().openEditor(task.id, date)}
      >
        <span className="task-title">{task.title}</span>
      </button>
      {task.time && <span className="task-time">{task.time}</span>}
      <span className="chips">
        {task.note.trim() !== '' && <span role="img" aria-label="Есть заметка" title="Есть заметка">✎</span>}
        {task.subtasks.length > 0 && <span className="chip" title="Подзадачи">{subDone}/{task.subtasks.length}</span>}
        {task.attachments.length > 0 && <span role="img" aria-label="Есть вложения" title="Есть вложения">📎</span>}
        {recurring && <span role="img" aria-label="Повторяется" title="Повторяется">↻</span>}
        {task.reminder !== null && task.time && <span role="img" aria-label="Есть напоминание" title="Есть напоминание">🔔</span>}
      </span>
    </>
  );
}

interface Props extends RowProps {
  container: string;
  large?: boolean;
}

export const SortableTask = memo(function SortableTask({ task, date, done, recurring, container, large }: Props) {
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging,
  } = useSortable({ id: itemId(task.id, date), data: { container, taskId: task.id, date, recurring } });
  const { role: _role, 'aria-pressed': _pressed, ...attrs } = attributes as unknown as Record<string, unknown>;
  void _role; void _pressed;
  return (
    <li
      ref={(el) => { setNodeRef(el); setActivatorNodeRef(el); }}
      {...attrs}
      {...listeners}
      role="listitem"
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      className={`task${done ? ' is-done' : ''}${large ? ' large' : ''}`}
      data-color={task.color}
    >
      <TaskBody task={task} date={date} done={done} recurring={recurring} />
    </li>
  );
});
