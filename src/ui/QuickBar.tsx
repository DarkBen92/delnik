import { useMemo, useState, type CSSProperties } from 'react';
import { addDays, startOfWeek } from '../domain/dates';
import { parseQuickInput } from '../domain/nlp';
import { describeRecurrence } from '../domain/recurrence';
import type { ISODate } from '../domain/types';
import { useApp, useAppStore, type AddTarget } from '../store/store';
import { IconPlus } from './icons';
import { COLOR_LABELS, MARKERS, dayLabel, plural } from './util';

type Where = 'today' | 'tomorrow' | 'someday';

const WHERE: [Where, string][] = [['today', 'Сегодня'], ['tomorrow', 'Завтра'], ['someday', 'Когда-нибудь']];

interface Chip { key: string; label: string; style?: CSSProperties }

/** Строка быстрого ввода над неделей (на телефоне — внизу экрана) и плашка с хвостами. */
export function QuickBar() {
  const store = useAppStore();
  const today = useApp((s) => s.today);
  // Селекторы возвращают строки и числа: новый объект на каждый вызов зациклил бы рендер.
  const listId = useApp((s) => firstList(s.data)?.id ?? null);
  const listTitle = useApp((s) => firstList(s.data)?.title ?? '');
  // Те же «хвосты», что переносит doRollover: невыполненные разовые задачи прошедших дней.
  const tails = useApp((s) => s.data.tasks.filter((t) => !t.recurrence && !t.done && t.date !== null && t.date < s.today).length);
  const [text, setText] = useState('');
  const [where, setWhere] = useState<Where>('today');

  const target: AddTarget = where === 'someday' && listId
    ? { listId }
    : { date: where === 'tomorrow' ? addDays(today, 1) : today };
  const parsed = useMemo(() => (text.trim() ? parseQuickInput(text, today) : null), [text, today]);

  const chips: Chip[] = [];
  if (parsed) {
    const d: ISODate | null = parsed.date ?? ('date' in target ? target.date : null);
    chips.push({ key: 'date', label: d ? dayLabel(d, today) : `«${listTitle}»` });
    if (parsed.time) chips.push({ key: 'time', label: parsed.time });
    if (parsed.recurrence && d) chips.push({ key: 'repeat', label: describeRecurrence(parsed.recurrence, d) });
    if (parsed.color && parsed.color !== 'none') {
      const m = MARKERS[parsed.color];
      chips.push({ key: 'color', label: COLOR_LABELS[parsed.color].toLowerCase(), style: { background: m.bg, color: m.ink, borderColor: 'transparent' } });
    }
  }

  const submit = () => {
    const raw = text.trim();
    if (!raw) return;
    const st = store.getState();
    const q = parseQuickInput(raw, today);
    if (!st.addFromInput(raw, target)) return;
    setText('');
    const d = q.date ?? ('date' in target ? target.date : null);
    if (!d) st.toast(`Добавлено в «${listTitle}»`);
    else if (startOfWeek(d) !== startOfWeek(st.anchor)) st.toast(`Добавлено: ${dayLabel(d, today)}`);
  };

  return (
    <div className="quick-row">
      <form className="quick" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="quick-where" role="radiogroup" aria-label="Куда добавить">
          {WHERE.filter(([w]) => w !== 'someday' || listId).map(([w, label]) => (
            <button key={w} type="button" role="radio" aria-checked={where === w} className={where === w ? 'on' : ''} onClick={() => setWhere(w)}>
              {label}
            </button>
          ))}
        </div>
        <div className="quick-field">
          <button type="submit" className="quick-add" aria-label="Добавить задачу" title="Добавить (Enter)">
            <IconPlus size={18} strokeWidth={2.4} />
          </button>
          <input
            id="quick-input"
            className="quick-input"
            type="text"
            aria-label="Быстрый ввод задачи"
            placeholder="завтра в 18:00 позвонить маме"
            autoComplete="off"
            enterKeyHint="done"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setText(''); e.currentTarget.blur(); }
            }}
          />
          {chips.length > 0 && (
            <span className="quick-chips" aria-label="Как поняли запись">
              {chips.map((c) => <span key={c.key} className="qchip" style={c.style}>{c.label}</span>)}
            </span>
          )}
          <kbd className="quick-kbd" title="Клавиша N ставит курсор сюда">N</kbd>
        </div>
      </form>
      {tails > 0 && (
        <div className="tails">
          <span className="tails-text">
            <span className="tails-dot" aria-hidden="true" />
            {tails} {plural(tails, ['хвост', 'хвоста', 'хвостов'])} с прошлых дней
          </span>
          <button type="button" className="tails-btn" onClick={() => store.getState().doRollover(true)}>
            Перенести на сегодня
          </button>
        </div>
      )}
    </div>
  );
}

function firstList(d: { lists: { id: string; calendarId: string; title: string; order: number }[]; settings: { activeCalendarId: string } }) {
  let best: { id: string; title: string; order: number } | undefined;
  for (const l of d.lists) {
    if (l.calendarId === d.settings.activeCalendarId && (!best || l.order < best.order)) best = l;
  }
  return best;
}
