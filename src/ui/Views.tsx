import { formatRu, isoWeekday, monthGrid, startOfWeek, weekDates, weekdayShortRu } from '../domain/dates';
import { getDayInfo } from '../domain/holidays';
import { tasksForDay } from '../domain/tasks';
import type { ISODate, Weekday } from '../domain/types';
import { useApp, useAppStore } from '../store/store';
import { DayColumn } from './DayColumn';
import { SomedayRow } from './Someday';

export function WeekView() {
  const anchor = useApp((s) => s.anchor);
  const start = startOfWeek(anchor);
  return (
    <>
      <div className="week">
        {weekDates(start).map((d) => <DayColumn key={d} date={d} />)}
      </div>
      <SomedayRow />
    </>
  );
}

export function DayView() {
  const anchor = useApp((s) => s.anchor);
  return (
    <>
      <div className="single-day"><DayColumn date={anchor} large /></div>
      <SomedayRow />
    </>
  );
}

export function MonthView() {
  const store = useAppStore();
  const anchor = useApp((s) => s.anchor);
  const data = useApp((s) => s.data);
  const today = useApp((s) => s.today);
  const { activeCalendarId: cal, showCompleted, showHolidays } = data.settings;
  const month = anchor.slice(0, 7);
  const grid = monthGrid(anchor);
  const open = (d: ISODate) => {
    store.getState().setAnchor(d);
    store.getState().setView('day');
  };
  return (
    <div className="month">
      {([1, 2, 3, 4, 5, 6, 7] as Weekday[]).map((w) => <div key={w} className="month-dow">{weekdayShortRu(w)}</div>)}
      {grid.map((d) => {
        const occ = tasksForDay(data, cal, d).filter((o) => showCompleted || !o.done);
        const info = getDayInfo(d);
        const wd = isoWeekday(d);
        const kind = showHolidays ? info.kind : (wd >= 6 ? 'weekend' : 'workday');
        const extra = occ.length - 3;
        return (
          <div key={d} className={`cell kind-${kind}${d.slice(0, 7) !== month ? ' other' : ''}${d === today ? ' is-today' : ''}`}>
            <button type="button" className="cell-num" aria-label={`Открыть день: ${formatRu(d, 'dayMonth')}`} onClick={() => open(d)}>
              {Number(d.slice(8))}
            </button>
            {showHolidays && info.name && <span className="cell-holiday" title={info.name}>{info.name}</span>}
            <ul className="cell-tasks">
              {occ.slice(0, 3).map((o) => (
                <li key={o.task.id} data-color={o.task.color} className={`cell-task${o.done ? ' is-done' : ''}`}>
                  <button type="button" onClick={() => store.getState().openEditor(o.task.id, d)} aria-label={`Открыть задачу «${o.task.title}» (${formatRu(d, 'dayMonth')})`}>
                    {o.task.title}
                  </button>
                </li>
              ))}
            </ul>
            {extra > 0 && <button type="button" className="cell-more" onClick={() => open(d)}>ещё {extra}</button>}
          </div>
        );
      })}
    </div>
  );
}
