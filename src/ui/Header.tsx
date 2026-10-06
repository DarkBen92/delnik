import { useDroppable } from '@dnd-kit/core';
import { addDays, formatRu, isoWeekNumber, monthYearShort, startOfWeek } from '../domain/dates';
import { useApp, useAppStore } from '../store/store';
import { IconLeft, IconMenu, IconRight, IconSearch } from './icons';

/** Стрелка недели; во время перетаскивания на неё можно «навести» задачу, и неделя перелистнётся. */
function NavButton({ dir }: { dir: -1 | 1 }) {
  const store = useAppStore();
  const id = dir < 0 ? 'nav:prev' : 'nav:next';
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`round dark${isOver ? ' is-over' : ''}`}
      aria-label={dir < 0 ? 'Предыдущая неделя' : 'Следующая неделя'}
      title={dir < 0 ? 'Предыдущая неделя (←)' : 'Следующая неделя (→)'}
      onClick={() => store.getState().shift(dir)}
    >
      {dir < 0 ? <IconLeft /> : <IconRight />}
    </button>
  );
}

export function Header() {
  const store = useAppStore();
  const anchor = useApp((s) => s.anchor);
  const today = useApp((s) => s.today);
  const calName = useApp((s) => {
    const cals = s.data.calendars;
    return cals.length > 1 ? cals.find((c) => c.id === s.data.settings.activeCalendarId)?.name ?? '' : '';
  });
  const weekStart = startOfWeek(anchor);
  // Месяц недели — по её четвергу (как в ISO), чтобы стык месяцев читался естественно.
  const thursday = addDays(weekStart, 3);
  const full = formatRu(thursday, 'monthYear');
  const short = monthYearShort(thursday);
  const isCurrent = weekStart === startOfWeek(today);
  const st = () => store.getState();

  return (
    <header className="top">
      <h1 className={`title${isCurrent ? '' : ' is-away'}`}>
        <button type="button" className="title-btn" title="Открыть месяц" onClick={() => st().openDialog({ kind: 'month' })}>
          <span className="t-full">{full}</span>
          <span className="t-short" aria-hidden="true">{short}</span>
          <span className="sr-only">, неделя {isoWeekNumber(weekStart)}</span>
          <span className="weekno" aria-hidden="true">№{isoWeekNumber(weekStart)}</span>
        </button>
        {calName && <span className="cal-name">{calName}</span>}
      </h1>
      <nav className="actions" aria-label="Навигация">
        <button type="button" className="round soft" aria-label="Поиск" title="Поиск (/)" onClick={() => st().setSearchOpen(true)}>
          <IconSearch />
        </button>
        <button type="button" className="round lilac" aria-label="Меню" title="Меню и настройки" onClick={() => st().openDialog({ kind: 'menu' })}>
          <IconMenu />
        </button>
        <NavButton dir={-1} />
        <NavButton dir={1} />
        {!isCurrent && (
          <button type="button" className="today-link" onClick={() => st().goToday()}>сегодня</button>
        )}
      </nav>
    </header>
  );
}
