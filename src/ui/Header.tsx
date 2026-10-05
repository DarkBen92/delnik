import { useDroppable } from '@dnd-kit/core';
import { formatRu, startOfWeek, weekRangeLabel } from '../domain/dates';
import type { ViewMode } from '../domain/types';
import { useApp, useAppStore } from '../store/store';

const VIEWS: { v: ViewMode; label: string }[] = [
  { v: 'week', label: 'Неделя' },
  { v: 'month', label: 'Месяц' },
  { v: 'day', label: 'День' },
];

const NAV_LABEL: Record<ViewMode, [string, string]> = {
  week: ['Предыдущая неделя', 'Следующая неделя'],
  month: ['Предыдущий месяц', 'Следующий месяц'],
  day: ['Предыдущий день', 'Следующий день'],
};

export function Header() {
  const store = useAppStore();
  const data = useApp((s) => s.data);
  const anchor = useApp((s) => s.anchor);
  const view = data.settings.view;
  const prev = useDroppable({ id: 'nav:prev' });
  const next = useDroppable({ id: 'nav:next' });
  const title = view === 'week' ? weekRangeLabel(startOfWeek(anchor))
    : view === 'month' ? formatRu(anchor, 'monthYear') : formatRu(anchor, 'full');
  const st = () => store.getState();
  return (
    <header className="topbar no-print">
      <span className="brand" aria-label="Дельник">
        <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
          <rect x="3" y="3" width="26" height="26" rx="7" fill="currentColor" />
          <path d="M9 17l4.5 4.5L23 11" fill="none" stroke="var(--accent-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="brand-word">Дельник</span>
      </span>
      <select
        className="cal-select"
        aria-label="Календарь"
        value={data.settings.activeCalendarId}
        onChange={(e) => st().setSettings({ activeCalendarId: e.target.value })}
      >
        {data.calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <div className="nav">
        <button type="button" ref={prev.setNodeRef} className={`icon-btn${prev.isOver ? ' is-over' : ''}`} aria-label={NAV_LABEL[view][0]} onClick={() => st().shift(-1)}>‹</button>
        <h2 className="range">{title}</h2>
        <button type="button" ref={next.setNodeRef} className={`icon-btn${next.isOver ? ' is-over' : ''}`} aria-label={NAV_LABEL[view][1]} onClick={() => st().shift(1)}>›</button>
        <button type="button" className="btn" onClick={() => st().goToday()}>Сегодня</button>
      </div>
      <div className="seg" role="group" aria-label="Вид">
        {VIEWS.map(({ v, label }) => (
          <button key={v} type="button" className="seg-btn" aria-pressed={view === v} onClick={() => st().setView(v)}>{label}</button>
        ))}
      </div>
      <div className="tools">
        <button type="button" className="btn" onClick={() => st().setSearchOpen(!st().searchOpen)}>Поиск</button>
        <button type="button" className="btn" onClick={() => st().openDialog({ kind: 'stats' })}>Итоги</button>
        <button type="button" className="icon-btn" aria-label="Справка по клавишам" title="Горячие клавиши" onClick={() => st().openDialog({ kind: 'help' })}>?</button>
        <button type="button" className="btn" onClick={() => st().openDialog({ kind: 'settings' })}>Настройки</button>
      </div>
    </header>
  );
}
