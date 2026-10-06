import { useEffect, useMemo, useRef } from 'react';
import {
  addDays, addMonths, formatRu, isoWeekNumber, isoWeekday, startOfWeek, weekRangeLabel,
} from '../domain/dates';
import { tasksForDay } from '../domain/tasks';
import type { AppData, ISODate } from '../domain/types';
import { useApp, useAppStore } from '../store/store';
import { IconClose } from './icons';
import { MARKERS, WEEKDAYS, WEEKDAY_SHORT } from './util';

const MAX_CHIPS = 3;

function weeksOfMonth(first: ISODate): ISODate[] {
  const out: ISODate[] = [];
  const last = addDays(addMonths(first, 1), -1);
  for (let w = startOfWeek(first); w <= last; w = addDays(w, 7)) out.push(w);
  return out;
}

function DayCell({ day, month, data, today }: { day: ISODate; month: string; data: AppData; today: ISODate }) {
  if (day.slice(0, 7) !== month) return <div className="m-day out" aria-hidden="true" />;
  const occ = tasksForDay(data, data.settings.activeCalendarId, day)
    .filter((o) => data.settings.showCompleted || !o.done);
  return (
    <div className={`m-day${isoWeekday(day) >= 6 ? ' we' : ''}`}>
      <span className={`m-num${day === today ? ' is-today' : ''}`}>{Number(day.slice(8))}</span>
      {occ.slice(0, MAX_CHIPS).map((o) => (
        <span
          key={o.task.id}
          className={`m-chip${o.done ? ' is-done' : ''}`}
          style={o.task.color === 'none' ? undefined : { background: MARKERS[o.task.color].bg, color: MARKERS[o.task.color].ink }}
        >
          {o.task.title}
        </span>
      ))}
      {occ.length > MAX_CHIPS && <span className="m-more">ещё {occ.length - MAX_CHIPS}</span>}
    </div>
  );
}

/** Боковая панель с лентой месяцев; клик по неделе открывает её. */
export function MonthPanel() {
  const store = useAppStore();
  const data = useApp((s) => s.data);
  const anchor = useApp((s) => s.anchor);
  const today = useApp((s) => s.today);
  const activeWeek = startOfWeek(anchor);
  const anchorMonth = `${addDays(activeWeek, 3).slice(0, 7)}-01`;
  const months = useMemo(() => Array.from({ length: 13 }, (_, i) => addMonths(anchorMonth, i - 3)), [anchorMonth]);
  const activeRef = useRef<HTMLDivElement>(null);
  const close = () => store.getState().closeDialog();
  const open = (w: ISODate) => { store.getState().setAnchor(w); close(); };

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'start' });
  }, []);

  return (
    <div className="overlay left" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <aside role="dialog" aria-modal="true" aria-label="Календарь" className="month-panel">
        <div className="mp-head">
          <h2 className={anchorMonth.slice(0, 7) === today.slice(0, 7) ? '' : 'is-away'}>{formatRu(anchorMonth, 'monthYear')}</h2>
          <button type="button" className="round soft" aria-label="Закрыть" onClick={close}><IconClose /></button>
        </div>
        <div className="mp-dows" aria-hidden="true">
          {WEEKDAYS.map((w) => <span key={w} className={w >= 6 ? 'we' : ''}>{WEEKDAY_SHORT[w]}</span>)}
        </div>
        <div className="mp-scroll">
          {months.map((m) => {
            const month = m.slice(0, 7);
            return (
              <div key={m} className="mp-month" ref={m === anchorMonth ? activeRef : undefined}>
                <h3>{formatRu(m, 'monthYear')}</h3>
                {weeksOfMonth(m).map((w) => (
                  <div
                    key={w}
                    role="button"
                    tabIndex={0}
                    className={`mp-week${w === activeWeek ? ' is-active' : ''}`}
                    aria-label={`Неделя ${weekRangeLabel(w)}`}
                    aria-current={w === activeWeek ? 'true' : undefined}
                    onClick={() => open(w)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(w); } }}
                  >
                    <span className="mp-weekno">{isoWeekNumber(w)}</span>
                    {Array.from({ length: 7 }, (_, i) => addDays(w, i)).map((d) => (
                      <DayCell key={d} day={d} month={month} data={data} today={today} />
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
