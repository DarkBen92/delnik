import { useState } from 'react';
import { formatRu, startOfWeek, weekDates, weekdayShortRu, isoWeekday } from '../domain/dates';
import { searchTasks, weekStats } from '../domain/tasks';
import { useApp, useAppStore } from '../store/store';
import { Dialog } from './Dialog';
import { STICKERS } from './util';
import { setSticker } from '../domain/tasks';

export function SearchPanel() {
  const store = useAppStore();
  const data = useApp((s) => s.data);
  const [q, setQ] = useState('');
  const cal = data.settings.activeCalendarId;
  const results = q.trim() ? searchTasks(data, q, cal) : [];
  const close = () => store.getState().setSearchOpen(false);
  return (
    <div className="search-panel no-print" role="search">
      <input
        type="search"
        role="searchbox"
        aria-label="Поиск по задачам"
        placeholder="Название, заметка или подзадача"
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button type="button" className="icon-btn" aria-label="Закрыть поиск" onClick={close}>×</button>
      {!q.trim() && <p className="empty-hint">Введите слово — найдём среди всех дат и списков.</p>}
      {q.trim() && results.length === 0 && <p className="empty-hint">Ничего не найдено</p>}
      {results.length > 0 && (
        <ul className="results" aria-label="Результаты поиска">
          {results.map((t) => {
            const list = t.listId ? data.lists.find((l) => l.id === t.listId) : null;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    const st = store.getState();
                    if (t.date) {
                      st.setAnchor(t.date);
                      if (st.data.settings.view !== 'week') st.setView('week');
                    }
                    st.openEditor(t.id, t.date);
                  }}
                >
                  <span className="r-title">{t.title}</span>
                  <span className="r-where">{t.date ? formatRu(t.date, 'full') : `Список «${list?.title ?? '—'}»`}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function StatsDialog() {
  const store = useAppStore();
  const data = useApp((s) => s.data);
  const anchor = useApp((s) => s.anchor);
  const today = useApp((s) => s.today);
  const cal = data.settings.activeCalendarId;
  const start = startOfWeek(anchor);
  const st = weekStats(data, cal, start, today);
  const pct = st.total ? Math.round((st.done / st.total) * 100) : 0;
  const overdue = data.tasks.filter((t) => t.calendarId === cal && !t.recurrence && !t.done && t.date !== null && t.date < today).length;
  const max = Math.max(1, ...st.byDay.map((d) => d.total));
  return (
    <Dialog label="Итоги недели" onClose={() => store.getState().closeDialog()}>
      <p className="muted">{formatRu(start, 'dayMonth')} — {formatRu(weekDates(start)[6], 'dayMonth')}</p>
      <p className="big">Выполнено: {st.done} из {st.total}</p>
      <div className="progress" role="progressbar" aria-label="Выполнено за неделю" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <ul className="bars" aria-label="По дням">
        {st.byDay.map((d) => (
          <li key={d.date} data-testid="stats-day" title={`${formatRu(d.date, 'dayMonth')}: ${d.done} из ${d.total}`}>
            <span className="bar"><span className="bar-total" style={{ height: `${(d.total / max) * 100}%` }}><span className="bar-done" style={{ height: d.total ? `${(d.done / d.total) * 100}%` : 0 }} /></span></span>
            <span className="bar-label">{weekdayShortRu(isoWeekday(d.date))}</span>
          </li>
        ))}
      </ul>
      <p>Серия без хвостов: <strong>{st.streak}</strong> {plural(st.streak, 'день', 'дня', 'дней')}</p>
      <button type="button" className="btn primary" disabled={overdue === 0} onClick={() => store.getState().doRollover(true)}>
        Перенести хвосты на сегодня ({overdue})
      </button>
      {overdue === 0 && <p className="muted">Просроченных задач нет.</p>}
    </Dialog>
  );
}

function plural(n: number, a: string, b: string, c: string): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return a;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return b;
  return c;
}

const KEYS: [string, string][] = [
  ['← / →', 'Предыдущий / следующий период'],
  ['T', 'Перейти к сегодня'],
  ['N', 'Новая задача на сегодня'],
  ['/', 'Поиск'],
  ['?', 'Эта справка'],
  ['Esc', 'Закрыть окно'],
];

export function HelpDialog() {
  const store = useAppStore();
  return (
    <Dialog label="Горячие клавиши" onClose={() => store.getState().closeDialog()}>
      <dl className="keys">
        {KEYS.map(([k, d]) => (
          <div key={k}><dt><kbd>{k}</kbd></dt><dd>{d}</dd></div>
        ))}
      </dl>
      <p className="muted">Подсказка: в поле задачи можно писать «каждый понедельник планёрка» или «в пятницу !красный».</p>
    </Dialog>
  );
}

export function StickerPicker() {
  const store = useAppStore();
  const day = useApp((s) => s.stickerDay);
  const cal = useApp((s) => s.data.settings.activeCalendarId);
  if (!day) return null;
  const pick = (e: string | null) => {
    store.getState().mutate((d) => setSticker(d, cal, day, e));
    store.getState().setStickerDay(null);
  };
  return (
    <div className="overlay no-print" onMouseDown={(e) => { if (e.target === e.currentTarget) store.getState().setStickerDay(null); }}>
      <div className="sticker-pop" role="group" aria-label={`Стикер на ${formatRu(day, 'dayMonth')}`}>
        <div className="sticker-grid">
          {STICKERS.map((e) => <button key={e} type="button" aria-label={e} onClick={() => pick(e)}>{e}</button>)}
        </div>
        <button type="button" className="btn" onClick={() => pick(null)}>Убрать</button>
      </div>
    </div>
  );
}

export function ShareConfirm() {
  const store = useAppStore();
  const snap = useApp((s) => s.pendingShare);
  if (!snap) return null;
  return (
    <Dialog label="Импорт календаря" onClose={() => store.getState().cancelShare()}>
      <p>{`Добавить календарь «${snap.calendar.name}» (${snap.tasks.length} задач)?`}</p>
      <div className="row">
        <button type="button" className="btn primary" onClick={() => store.getState().confirmShare()}>Добавить</button>
        <button type="button" className="btn" onClick={() => store.getState().cancelShare()}>Отмена</button>
      </div>
    </Dialog>
  );
}

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const store = useAppStore();
  return (
    <div className="toasts no-print" role="status" aria-live="polite">
      {toasts.map((t) => <ToastItem key={t.id} id={t.id} text={t.text} tone={t.tone} onDone={(i) => store.getState().dismissToast(i)} />)}
    </div>
  );
}

import { useEffect } from 'react';
function ToastItem({ id, text, tone, onDone }: { id: number; text: string; tone: string; onDone: (id: number) => void }) {
  useEffect(() => {
    const h = setTimeout(() => onDone(id), tone === 'error' ? 8000 : 5000);
    return () => clearTimeout(h);
  }, [id, tone, onDone]);
  return (
    <div className={`toast ${tone}`}>
      <span>{text}</span>
      <button type="button" className="icon-btn small" aria-label="Скрыть уведомление" onClick={() => onDone(id)}>×</button>
    </div>
  );
}
