import { useState } from 'react';
import { addMonths, formatRu, isoWeekday, monthGrid } from '../domain/dates';
import type { ISODate } from '../domain/types';
import { useApp } from '../store/store';
import { IconLeft, IconRight } from './icons';
import { WEEKDAYS, WEEKDAY_SHORT } from './util';

/** Компактный месяц для выбора даты: выбранный день — тёмный кружок. */
export function MiniCalendar({ value, onPick }: { value: ISODate | null; onPick: (d: ISODate) => void }) {
  const today = useApp((s) => s.today);
  const [month, setMonth] = useState(() => `${(value ?? today).slice(0, 7)}-01`);
  const grid = monthGrid(month);
  const m = month.slice(0, 7);
  return (
    <div className="mini-cal">
      <div className="mini-cal-head">
        <button type="button" className="icon-btn" aria-label="Предыдущий месяц" onClick={() => setMonth(addMonths(month, -1))}><IconLeft size={16} /></button>
        <span>{formatRu(month, 'monthYear')}</span>
        <button type="button" className="icon-btn" aria-label="Следующий месяц" onClick={() => setMonth(addMonths(month, 1))}><IconRight size={16} /></button>
      </div>
      <div className="mini-cal-grid" role="grid" aria-label={formatRu(month, 'monthYear')}>
        {WEEKDAYS.map((w) => <span key={w} className="mini-dow" aria-hidden="true">{WEEKDAY_SHORT[w]}</span>)}
        {grid.map((d) => (
          <button
            key={d}
            type="button"
            className={`mini-day${d.slice(0, 7) === m ? '' : ' out'}${d === value ? ' is-selected' : ''}${d === today ? ' is-today' : ''}${isoWeekday(d) >= 6 ? ' we' : ''}`}
            aria-label={formatRu(d, 'full')}
            aria-pressed={d === value}
            onClick={() => onPick(d)}
          >
            {Number(d.slice(8))}
          </button>
        ))}
      </div>
    </div>
  );
}
