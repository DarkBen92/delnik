import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useMemo } from 'react';
import { formatRu, isoWeekday, weekdayShortRu } from '../domain/dates';
import { getDayInfo } from '../domain/holidays';
import { tasksForDay } from '../domain/tasks';
import { useApp, useAppStore } from '../store/store';
import { itemId, SortableTask } from './TaskItem';
import { NewTask } from './NewTask';

export function DayColumn({ date, large }: { date: ISODateStr; large?: boolean }) {
  const store = useAppStore();
  const data = useApp((s) => s.data);
  const today = useApp((s) => s.today);
  const { activeCalendarId: cal, showCompleted, showHolidays } = data.settings;
  const wd = isoWeekday(date);
  const info = useMemo(() => getDayInfo(date), [date]);
  const container = `day:${date}`;
  const all = tasksForDay(data, cal, date);
  const shown = showCompleted ? all : all.filter((o) => !o.done);
  const { setNodeRef, isOver } = useDroppable({ id: container, data: { container } });
  const sticker = data.calendars.find((c) => c.id === cal)?.stickers[date];
  const kind = showHolidays ? info.kind : (wd >= 6 ? 'weekend' : 'workday');
  const ids = shown.map((o) => itemId(o.task.id, date));

  return (
    <section
      className={`day kind-${kind}${date === today ? ' is-today' : ''}${large ? ' large' : ''}`}
      aria-label={formatRu(date, 'full')}
      aria-current={date === today ? 'date' : undefined}
      data-date={date}
      data-wd={wd}
    >
      <header className="day-head">
        <span className="day-num">{Number(date.slice(8))}</span>
        <span className="day-dow">{weekdayShortRu(wd)}</span>
        {showHolidays && info.name && <span className="day-holiday">{info.name}</span>}
        {showHolidays && info.kind === 'shortened' && <span className="day-short">сокр.</span>}
        <button
          type="button"
          className="sticker-btn no-print-empty"
          aria-label={`Стикер на ${formatRu(date, 'dayMonth')}`}
          onClick={() => store.getState().setStickerDay(date)}
        >
          {sticker ?? '☺'}
        </button>
      </header>
      <div ref={setNodeRef} className={`day-body${isOver ? ' is-over' : ''}`}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="tasks">
            {shown.map((o) => (
              <SortableTask key={itemId(o.task.id, date)} task={o.task} date={date} done={o.done} recurring={o.recurring} container={container} large={large} />
            ))}
          </ul>
        </SortableContext>
        {large && shown.length === 0 && <p className="empty-hint">День свободен. Запишите первое дело ниже.</p>}
        <div className="no-print"><NewTask target={{ date }} /></div>
      </div>
    </section>
  );
}

type ISODateStr = string;
