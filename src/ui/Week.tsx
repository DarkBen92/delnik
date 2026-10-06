import { memo, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { dayMonthShort, formatRu, isoWeekday, weekDates, weekdayShortRu } from '../domain/dates';
import { getDayInfo } from '../domain/holidays';
import { tasksForDay, toggleDone } from '../domain/tasks';
import type { ISODate, Task } from '../domain/types';
import { useApp, useAppStore, type AddTarget } from '../store/store';
import { CheckCircle, IconBell, IconClip, IconRepeat } from './icons';
import { MARKERS } from './util';

export const itemId = (taskId: string, date: ISODate | null) => `t:${taskId}:${date ?? ''}`;

export interface RowProps {
  task: Task;
  date: ISODate | null;
  done: boolean;
  recurring: boolean;
}

/** Содержимое строки: текст-«маркер» и кружок выполнения. */
export function TaskLine({ task, date, done, recurring }: RowProps) {
  const store = useAppStore();
  const m = MARKERS[task.color];
  const subDone = task.subtasks.filter((s) => s.done).length;
  const pill: CSSProperties = task.color === 'none' ? {} : { background: m.bg, color: m.ink };
  return (
    <>
      <button
        type="button"
        className="task-text"
        aria-label={`Открыть задачу «${task.title}»`}
        onClick={() => store.getState().openEditor(task.id, date)}
      >
        <span className="pill" style={pill}>
          {task.time && <span className="task-time">{task.time}</span>}
          {task.title}
        </span>
        <span className="task-meta" aria-hidden="true">
          {recurring && <IconRepeat size={13} />}
          {task.reminder !== null && task.time && <IconBell size={13} />}
          {task.attachments.length > 0 && <IconClip size={13} />}
          {task.subtasks.length > 0 && <span>{subDone}/{task.subtasks.length}</span>}
          {task.note.trim() !== '' && <span className="note-dot" />}
        </span>
      </button>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={task.title}
        className="check"
        onClick={() => store.getState().mutate((d) => toggleDone(d, task.id, recurring ? (date ?? undefined) : undefined))}
      >
        <CheckCircle />
      </button>
    </>
  );
}

export const TaskRow = memo(function TaskRow({ container, ...p }: RowProps & { container: string }) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemId(p.task.id, p.date),
    data: { container, taskId: p.task.id, date: p.date, recurring: p.recurring },
  });
  return (
    <li
      ref={setNodeRef}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`row task${p.done ? ' is-done' : ''}${isDragging ? ' is-dragging' : ''}`}
    >
      <TaskLine {...p} />
    </li>
  );
});

/** Пустая строка-поле: печатаешь прямо на линейке, Enter сохраняет, фокус остаётся. */
export function NewTaskLine({ target, inputRef }: { target: AddTarget; inputRef?: React.Ref<HTMLInputElement> }) {
  const store = useAppStore();
  const [text, setText] = useState('');
  return (
    <div className="row new-row">
      <input
        ref={inputRef}
        type="text"
        className="new-task"
        aria-label="Новая задача"
        title="Можно писать по-русски: «завтра в 18:00 позвонить маме», «по будням стендап»"
        value={text}
        autoComplete="off"
        enterKeyHint="done"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (store.getState().addFromInput(text, target)) setText('');
          } else if (e.key === 'Escape') {
            setText('');
            e.currentTarget.blur();
          }
        }}
        onBlur={() => {
          if (text.trim() && store.getState().addFromInput(text, target)) setText('');
        }}
      />
    </div>
  );
}

/** Тело с линейкой: задачи + строка ввода; клик по пустым линиям ставит фокус в ввод. */
export function LinedBody({
  container, target, rows, className = '',
}: { container: string; target: AddTarget; rows: RowProps[]; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const { setNodeRef, isOver } = useDroppable({ id: container, data: { container } });
  const ids = rows.map((r) => itemId(r.task.id, r.date));
  const onBodyClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('.task, button, input')) return;
    input.current?.focus();
  };
  return (
    <div ref={setNodeRef} className={`lined ${className}${isOver ? ' is-over' : ''}`} onClick={onBodyClick}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="rows">
          {rows.map((r) => <TaskRow key={itemId(r.task.id, r.date)} container={container} {...r} />)}
        </ul>
      </SortableContext>
      <NewTaskLine target={target} inputRef={input} />
    </div>
  );
}

export function DayColumn({ date }: { date: ISODate }) {
  const store = useAppStore();
  const data = useApp((s) => s.data);
  const today = useApp((s) => s.today);
  const { activeCalendarId: cal, showCompleted, showHolidays } = data.settings;
  const info = useMemo(() => getDayInfo(date), [date]);
  const all = tasksForDay(data, cal, date);
  const rows = (showCompleted ? all : all.filter((o) => !o.done))
    .map((o) => ({ task: o.task, date, done: o.done, recurring: o.recurring }));
  const sticker = data.calendars.find((c) => c.id === cal)?.stickers[date];
  const isToday = date === today;
  const holiday = showHolidays && info.kind === 'holiday' && info.name;
  const shortened = showHolidays && info.kind === 'shortened';

  return (
    <section
      className={`day${isToday ? ' is-today' : ''}${holiday ? ' is-holiday' : ''}`}
      aria-label={formatRu(date, 'full')}
      aria-current={isToday ? 'date' : undefined}
      data-date={date}
    >
      <header className="day-head">
        <span className="day-date">
          {dayMonthShort(date)}
          {sticker && <span className="sticker" aria-label={`Стикер ${sticker}`}>{sticker}</span>}
        </span>
        <button
          type="button"
          className="sticker-btn"
          aria-label={`Стикер на ${formatRu(date, 'dayMonth')}`}
          title="Стикер"
          onClick={() => store.getState().setStickerDay(date)}
        >
          ☺
        </button>
        <span className="day-dow">{weekdayShortRu(isoWeekday(date))}</span>
      </header>
      {(holiday || shortened) && (
        <div className="day-note" title={holiday ? 'Праздничный день' : 'Сокращённый рабочий день'}>
          {holiday ? info.name : 'Сокращённый день'}
        </div>
      )}
      <LinedBody container={`day:${date}`} target={{ date }} rows={rows} />
    </section>
  );
}

export function WeekGrid() {
  const anchor = useApp((s) => s.anchor);
  const days = weekDates(anchor);
  return (
    <div className="week">
      {days.slice(0, 5).map((d) => <div className="col" key={d}><DayColumn date={d} /></div>)}
      <div className="col weekend">
        <DayColumn date={days[5]} />
        <DayColumn date={days[6]} />
      </div>
    </div>
  );
}
