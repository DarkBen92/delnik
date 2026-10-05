import { useEffect, useMemo, useRef, useState } from 'react';
import { formatRu, startOfWeek, weekRangeLabel } from '../domain/dates';
import { searchTasks, setSticker, weekStats } from '../domain/tasks';
import { useApp, useAppStore } from '../store/store';
import { Dialog } from './Dialog';
import { IconClose, IconSearch } from './icons';
import { STICKERS, plural } from './util';

export function SearchPanel() {
  const store = useAppStore();
  const data = useApp((s) => s.data);
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const cal = data.settings.activeCalendarId;
  const results = useMemo(() => searchTasks(data, q, cal), [data, q, cal]);
  const listName = (id: string | null) => data.lists.find((l) => l.id === id)?.title ?? 'Список';
  const close = () => store.getState().setSearchOpen(false);
  return (
    <div className="overlay top-align" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="search" role="search">
        <div className="search-bar">
          <IconSearch />
          <input
            ref={input}
            type="search"
            aria-label="Поиск задач"
            placeholder="Найти задачу"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
          />
          <button type="button" className="tool" aria-label="Закрыть поиск" onClick={close}><IconClose size={18} /></button>
        </div>
        {q.trim() !== '' && (
          results.length === 0
            ? <p className="search-empty">Ничего не нашлось. Попробуйте другое слово.</p>
            : (
              <ul className="search-results" aria-label="Результаты поиска">
                {results.slice(0, 50).map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={t.done ? 'is-done' : ''}
                      onClick={() => {
                        const st = store.getState();
                        if (t.date) st.setAnchor(t.date);
                        close();
                        st.openEditor(t.id, t.date);
                      }}
                    >
                      <span className="sr-title">{t.title}</span>
                      <span className="sr-when">{t.date ? formatRu(t.date, 'dayMonth') : listName(t.listId)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
        )}
      </div>
    </div>
  );
}

export function StatsDialog() {
  const store = useAppStore();
  const data = useApp((s) => s.data);
  const anchor = useApp((s) => s.anchor);
  const today = useApp((s) => s.today);
  const ws = startOfWeek(anchor);
  const stats = weekStats(data, data.settings.activeCalendarId, ws, today);
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  const overdue = data.tasks.filter((t) => !t.recurrence && !t.done && t.date !== null && t.date < today).length;
  const max = Math.max(1, ...stats.byDay.map((d) => d.total));
  return (
    <Dialog label="Итоги недели" onClose={() => store.getState().closeDialog()}>
      <p className="muted">{weekRangeLabel(ws)}</p>
      <p className="big">Выполнено {stats.done} из {stats.total}</p>
      <div className="progress" role="progressbar" aria-label="Выполнено за неделю" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="bars">
        {stats.byDay.map((d) => (
          <div key={d.date} className="bar" data-testid="stats-day" title={`${formatRu(d.date, 'dayMonth')}: ${d.done} из ${d.total}`}>
            <div className="bar-track">
              <span className="bar-total" style={{ height: `${(d.total / max) * 100}%` }} />
              <span className="bar-done" style={{ height: `${(d.done / max) * 100}%` }} />
            </div>
            <span className="bar-label">{formatRu(d.date, 'weekdayShort')}</span>
          </div>
        ))}
      </div>
      <p>Серия без хвостов: <b>{stats.streak}</b> {plural(stats.streak, ['день', 'дня', 'дней'])}</p>
      <button type="button" className="pill-btn wide" disabled={overdue === 0} onClick={() => store.getState().doRollover(true)}>
        Перенести хвосты на сегодня ({overdue})
      </button>
      <p className="muted small">{overdue === 0 ? 'Просроченных задач нет.' : 'Невыполненные задачи прошлых дней переедут на сегодня.'}</p>
    </Dialog>
  );
}

const KEYS: [string, string][] = [
  ['← →', 'Предыдущая и следующая неделя'],
  ['T', 'Вернуться к сегодняшнему дню'],
  ['N', 'Новая задача на сегодня'],
  ['/', 'Поиск'],
  ['M', 'Календарь на месяц'],
  ['?', 'Эта подсказка'],
  ['Esc', 'Закрыть окно'],
];

export function HelpDialog() {
  const store = useAppStore();
  return (
    <Dialog label="Горячие клавиши" onClose={() => store.getState().closeDialog()}>
      <dl className="keys">
        {KEYS.map(([k, v]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{v}</dd></div>)}
      </dl>
      <p className="muted small">
        Быстрый ввод понимает русский: «завтра в 18:00 позвонить маме», «каждую среду бассейн», «по будням стендап в 10:00 !синий».
      </p>
    </Dialog>
  );
}

export function ShareConfirm() {
  const store = useAppStore();
  const snap = useApp((s) => s.pendingShare);
  if (!snap) return null;
  const n = snap.tasks.length;
  return (
    <Dialog label="Календарь по ссылке" onClose={() => store.getState().cancelShare()}>
      <p>Добавить календарь «{snap.calendar.name}» ({n} {plural(n, ['задача', 'задачи', 'задач'])})?</p>
      <div className="btn-row">
        <button type="button" className="pill-btn dark" onClick={() => store.getState().confirmShare()}>Добавить</button>
        <button type="button" className="pill-btn" onClick={() => store.getState().cancelShare()}>Отмена</button>
      </div>
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
    <Dialog label={`Стикер на ${formatRu(day, 'dayMonth')}`} onClose={() => store.getState().setStickerDay(null)}>
      <div className="stickers">
        {STICKERS.map((s) => <button key={s} type="button" aria-label={s} onClick={() => pick(s)}>{s}</button>)}
      </div>
      <button type="button" className="link-btn" onClick={() => pick(null)}>Убрать</button>
    </Dialog>
  );
}

export function Toasts() {
  const store = useAppStore();
  const toasts = useApp((s) => s.toasts);
  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const h = setTimeout(() => store.getState().dismissToast(toasts[0].id), 4000);
    return () => clearTimeout(h);
  }, [toasts, store]);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          <span>{t.text}</span>
          <button type="button" className="tool" aria-label="Скрыть уведомление" onClick={() => store.getState().dismissToast(t.id)}>
            <IconClose size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
