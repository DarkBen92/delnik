import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { addDays, dayMonthShort, formatRu, isoWeekday, weekdayShortRu } from '../domain/dates';
import { describeRecurrence } from '../domain/recurrence';
import { addTask, deleteTask, moveTask, skipOccurrence, toggleDone, updateTask } from '../domain/tasks';
import { TASK_COLORS, type ISODate, type Recurrence, type RecurrenceFreq, type Task, type Weekday } from '../domain/types';
import { makeId } from '../domain/ids';
import { useApp, useAppStore } from '../store/store';
import { FILE_TOO_BIG, MAX_FILE_SIZE, deleteFile, getFile, putFile } from '../store/files';
import {
  IconArrowDown, IconArrowRight, IconBell, IconCalendar, IconClip, IconClock, IconClose, IconCopy, IconPlus,
  IconRepeat, IconTick, IconTimer, IconTrash,
} from './icons';
import { MiniCalendar } from './MiniCalendar';
import { COLOR_LABELS, MARKERS, REMINDER_OPTIONS, WEEKDAYS, WEEKDAY_SHORT, capitalize, downloadBlob, formatBytes } from './util';

type Pop = null | 'date' | 'repeat' | 'reminder' | 'delete';

function AutoText({ value, onChange, className, label, placeholder, onEnter }: {
  value: string; onChange: (v: string) => void; className: string; label: string; placeholder?: string; onEnter?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      className={className}
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (onEnter && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnter(); } }}
    />
  );
}

function Tool({ label, active, disabled, onClick, children }: {
  label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`tool${active ? ' is-active' : ''}`}
      aria-label={label}
      title={label}
      aria-expanded={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const PRESETS: { key: string; label: (t: Task) => string; make: (t: Task) => Recurrence | null }[] = [
  { key: 'none', label: () => 'Не повторять', make: () => null },
  { key: 'daily', label: () => 'Каждый день', make: () => ({ freq: 'daily', interval: 1 }) },
  {
    key: 'weekly',
    label: (t) => `Каждую неделю, ${t.date ? weekdayShortRu(isoWeekday(t.date)) : ''}`,
    make: () => ({ freq: 'weekly', interval: 1 }),
  },
  { key: 'workdays', label: () => 'По будням', make: () => ({ freq: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5] }) },
  { key: 'monthly', label: (t) => `Каждый месяц, ${t.date ? Number(t.date.slice(8)) : ''} числа`, make: () => ({ freq: 'monthly', interval: 1 }) },
  { key: 'yearly', label: (t) => `Каждый год, ${t.date ? formatRu(t.date, 'dayMonth') : ''}`, make: () => ({ freq: 'yearly', interval: 1 }) },
];

const UNIT: Record<RecurrenceFreq, string> = { daily: 'дн.', weekly: 'нед.', monthly: 'мес.', yearly: 'г.' };

function RepeatPop({ task, onChange }: { task: Task; onChange: (r: Recurrence | null) => void }) {
  const r = task.recurrence;
  const start = task.date ?? '';
  return (
    <div className="pop-body">
      <div className="pop-list" role="radiogroup" aria-label="Повтор">
        {PRESETS.map((p) => {
          const made = p.make(task);
          const checked = JSON.stringify(made) === JSON.stringify(r ? { freq: r.freq, interval: r.interval, ...(r.weekdays ? { weekdays: r.weekdays } : {}) } : null);
          return (
            <button key={p.key} type="button" role="radio" aria-checked={checked} className="pop-item" onClick={() => onChange(made ? { ...made, until: r?.until ?? null } : null)}>
              {p.label(task)}
            </button>
          );
        })}
      </div>
      {r && (
        <div className="pop-custom">
          <div className="pop-row">
            <span>Каждые</span>
            <input
              type="number"
              min={1}
              max={99}
              aria-label="Интервал повтора"
              value={r.interval}
              onChange={(e) => onChange({ ...r, interval: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })}
            />
            <select aria-label="Единица повтора" value={r.freq} onChange={(e) => onChange({ ...r, freq: e.target.value as RecurrenceFreq, weekdays: e.target.value === 'weekly' ? r.weekdays : undefined })}>
              {(Object.keys(UNIT) as RecurrenceFreq[]).map((f) => <option key={f} value={f}>{UNIT[f]}</option>)}
            </select>
          </div>
          {r.freq === 'weekly' && (
            <div className="pop-days" role="group" aria-label="Дни недели">
              {WEEKDAYS.map((w) => {
                const on = (r.weekdays && r.weekdays.length ? r.weekdays : [isoWeekday(start)]).includes(w);
                return (
                  <button
                    key={w}
                    type="button"
                    className={`daypick${on ? ' on' : ''}`}
                    aria-pressed={on}
                    aria-label={WEEKDAY_SHORT[w]}
                    onClick={() => {
                      const cur = r.weekdays && r.weekdays.length ? r.weekdays : [isoWeekday(start)];
                      const next = (on ? cur.filter((x) => x !== w) : [...cur, w]).sort() as Weekday[];
                      onChange({ ...r, weekdays: next.length ? next : undefined });
                    }}
                  >
                    {WEEKDAY_SHORT[w]}
                  </button>
                );
              })}
            </div>
          )}
          <label className="pop-row">
            <span>До</span>
            <input type="date" aria-label="Повторять до" value={r.until ?? ''} min={start} onChange={(e) => onChange({ ...r, until: e.target.value || null })} />
          </label>
          <p className="pop-hint">{describeRecurrence(r, start)}</p>
        </div>
      )}
    </div>
  );
}

function ReminderPop({ task, onSave }: { task: Task; onSave: (time: string | null, reminder: number | null) => void }) {
  const [time, setTime] = useState(task.time ?? '09:00');
  const [rem, setRem] = useState(task.reminder === null ? '' : String(task.reminder));
  const [h, m] = time.split(':').map(Number);
  const set = (hh: number, mm: number) => setTime(`${String((hh + 24) % 24).padStart(2, '0')}:${String((mm + 60) % 60).padStart(2, '0')}`);
  return (
    <div className="pop-body">
      <div className="time-pick">
        <div className="spin">
          <button type="button" aria-label="Час больше" onClick={() => set(h + 1, m)}>▲</button>
          <input aria-label="Часы" inputMode="numeric" value={String(h).padStart(2, '0')} onChange={(e) => set(Math.min(23, Number(e.target.value.replace(/\D/g, '')) || 0), m)} />
          <button type="button" aria-label="Час меньше" onClick={() => set(h - 1, m)}>▼</button>
        </div>
        <span className="colon">:</span>
        <div className="spin">
          <button type="button" aria-label="Минуты больше" onClick={() => set(h, m + 5 - (m % 5))}>▲</button>
          <input aria-label="Минуты" inputMode="numeric" value={String(m).padStart(2, '0')} onChange={(e) => set(h, Math.min(59, Number(e.target.value.replace(/\D/g, '')) || 0))} />
          <button type="button" aria-label="Минуты меньше" onClick={() => set(h, m - (m % 5 || 5))}>▼</button>
        </div>
      </div>
      <label className="pop-row">
        <span>Напомнить</span>
        <select aria-label="Напоминание" value={rem} onChange={(e) => setRem(e.target.value)}>
          {REMINDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <button type="button" className="pill-btn" onClick={() => onSave(time, rem === '' ? null : Number(rem))}>Сохранить</button>
      {task.time && <button type="button" className="link-btn" onClick={() => onSave(null, null)}>Убрать время</button>}
    </div>
  );
}

function Attachments({ task }: { task: Task }) {
  const store = useAppStore();
  if (task.attachments.length === 0) return null;
  return (
    <ul className="attachments" aria-label="Вложения">
      {task.attachments.map((a) => (
        <li key={a.id}>
          <IconClip size={14} />
          <button
            type="button"
            className="link-btn"
            onClick={async () => {
              const b = await getFile(a.id);
              if (b) downloadBlob(a.name, b, a.type);
              else store.getState().toast('Файл не найден в этом браузере', 'error');
            }}
          >
            {a.name}
          </button>
          <span className="muted">{formatBytes(a.size)}</span>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Удалить вложение ${a.name}`}
            onClick={async () => {
              await deleteFile(a.id).catch(() => undefined);
              store.getState().mutate((d) => updateTask(d, task.id, {
                attachments: (d.tasks.find((t) => t.id === task.id)?.attachments ?? []).filter((x) => x.id !== a.id),
              }));
            }}
          >
            <IconClose size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** «Вт, 6 окт. · сегодня»; год — только если он не текущий. */
function dateChipLabel(d: ISODate, today: ISODate): string {
  const base = `${capitalize(weekdayShortRu(isoWeekday(d)))}, ${dayMonthShort(d)}${d.slice(0, 4) === today.slice(0, 4) ? '' : ` ${d.slice(0, 4)}`}`;
  const rel = d === today ? 'сегодня' : d === addDays(today, 1) ? 'завтра' : d === addDays(today, -1) ? 'вчера' : '';
  return rel ? `${base} · ${rel}` : base;
}

export function Editor({ id, occDate }: { id: string; occDate: string | null }) {
  const store = useAppStore();
  const task = useApp((s) => s.data.tasks.find((t) => t.id === id));
  const lists = useApp((s) => s.data.lists);
  const today = useApp((s) => s.today);
  const [pop, setPop] = useState<Pop>(null);
  const [subText, setSubText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLTextAreaElement>('.ed-title')?.focus();
    return () => { if (prev && document.contains(prev)) prev.focus(); };
  }, []);

  useEffect(() => {
    if (!task) store.getState().closeDialog();
  }, [task, store]);
  if (!task) return null;

  const st = () => store.getState();
  const close = () => st().closeDialog();
  const patch = (p: Partial<Task>) => st().mutate((d) => updateTask(d, id, p));
  const recurring = task.recurrence !== null;
  const occ = recurring ? (occDate ?? task.date) : task.date;
  const done = recurring ? !!occ && task.completedDates.includes(occ) : task.done;
  const toggle = (p: Pop) => setPop((cur) => (cur === p ? null : p));
  const calLists = lists.filter((l) => l.calendarId === task.calendarId).sort((a, b) => a.order - b.order);
  const listName = task.listId ? lists.find((l) => l.id === task.listId)?.title ?? 'Список' : null;
  const where = occ ? dateChipLabel(occ, today) : `Когда-нибудь · ${listName}`;
  const reminderLabel = task.reminder === null ? null : REMINDER_OPTIONS.find((o) => o.value === String(task.reminder))?.label ?? null;
  const subsDone = task.subtasks.filter((s) => s.done).length;
  const noDate = task.date ? undefined : 'Сначала поставьте задачу на день';

  const moveTo = (target: { date: string } | { listId: string }) => {
    st().mutate((d) => moveTask(d, id, target, undefined, recurring && occ ? occ : undefined));
    setPop(null);
    if (recurring && occ) close(); // вхождение стало отдельной задачей
  };

  // Быстрые переносы внизу: от дня задачи, а у задачи из списка — от сегодня.
  const firstList = calLists.find((l) => l.id !== task.listId);
  const moves: { key: string; label: ReactNode; to: { date: string } | { listId: string } }[] = occ
    ? [
      { key: 'tomorrow', label: <>На завтра <IconArrowRight size={14} /></>, to: { date: addDays(occ, 1) } },
      { key: 'week', label: 'На след. неделю', to: { date: addDays(occ, 7) } },
    ]
    : [
      { key: 'today', label: 'На сегодня', to: { date: today } },
      { key: 'tomorrow', label: <>На завтра <IconArrowRight size={14} /></>, to: { date: addDays(today, 1) } },
    ];
  if (firstList) moves.push({ key: 'list', label: `В «${firstList.title}»`, to: { listId: firstList.id } });

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (f.size > MAX_FILE_SIZE) { st().toast(`${f.name}: ${FILE_TOO_BIG}`, 'error'); continue; }
      const fid = makeId();
      try {
        await putFile(fid, f);
        st().mutate((d) => updateTask(d, id, {
          attachments: [...(d.tasks.find((t) => t.id === id)?.attachments ?? []), { id: fid, name: f.name, size: f.size, type: f.type }],
        }));
      } catch {
        st().toast(`Не удалось сохранить ${f.name}`, 'error');
      }
    }
  };

  const removeAll = () => {
    for (const a of task.attachments) void deleteFile(a.id).catch(() => undefined);
    st().mutate((d) => deleteTask(d, id));
    close();
  };

  const duplicate = () => {
    const { id: _i, createdAt: _c, updatedAt: _u, order: _o, ...rest } = task;
    void _i; void _c; void _u; void _o;
    st().mutate((d) => addTask(d, task.date
      ? { ...rest, attachments: [], date: occ ?? task.date, listId: null, recurrence: null, completedDates: [], skippedDates: [] }
      : { ...rest, attachments: [], listId: task.listId as string, date: null }).data);
    st().toast('Задача продублирована');
  };

  const addSub = () => {
    const t = subText.trim();
    if (!t) return;
    patch({ subtasks: [...task.subtasks, { id: makeId(), title: t, done: false }] });
    setSubText('');
  };

  const popEl = pop && (
    <div className={`pop pop-${pop}`} role="group" aria-label={{
      date: 'Дата', repeat: 'Повтор', reminder: 'Время и напоминание', delete: 'Удаление',
    }[pop]}>
      {pop === 'date' && (
        <div className="pop-body">
          <MiniCalendar value={occ} onPick={(d) => moveTo({ date: d })} />
          <div className="pop-sep" />
          {calLists.map((l) => (
            <button key={l.id} type="button" className="pop-item" onClick={() => moveTo({ listId: l.id })}>
              <IconArrowDown size={16} /> В «{l.title}»
            </button>
          ))}
        </div>
      )}
      {pop === 'repeat' && <RepeatPop task={task} onChange={(r) => patch({ recurrence: r })} />}
      {pop === 'reminder' && (
        <ReminderPop task={task} onSave={(time, reminder) => { patch({ time, reminder: time ? reminder : null }); setPop(null); }} />
      )}
      {pop === 'delete' && (
        <div className="pop-body pop-list">
          <button type="button" className="pop-item" onClick={() => { if (occ) st().mutate((d) => skipOccurrence(d, id, occ)); close(); }}>Только это</button>
          <button type="button" className="pop-item danger" onClick={removeAll}>Всю серию</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Задача" className="sheet editor" onKeyDown={(e) => {
        if (e.key === 'Escape' && pop) { e.stopPropagation(); setPop(null); }
      }}>
        <div className="ed-bar">
          <button type="button" className="ed-date" aria-label="Дата" aria-expanded={pop === 'date'} onClick={() => toggle('date')}>
            <IconCalendar size={16} />
            <span>{where}</span>
          </button>
          <div className="ed-tools">
            <Tool label="Фокус-таймер" onClick={() => { st().setFocus({ taskId: id, title: task.title }); close(); }}><IconTimer size={18} /></Tool>
            <Tool label="Дублировать" onClick={duplicate}><IconCopy size={18} /></Tool>
            <Tool label="Удалить" active={pop === 'delete'} onClick={() => (recurring ? toggle('delete') : removeAll())}><IconTrash size={18} /></Tool>
            <Tool label="Закрыть" onClick={close}><IconClose size={18} /></Tool>
          </div>
        </div>

        {(pop === 'date' || pop === 'delete') && popEl}

        <div className={`ed-title-row${done ? ' is-done' : ''}`}>
          <AutoText className="ed-title" label="Название" value={task.title} onChange={(v) => patch({ title: v })} />
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label="Выполнено"
            className="ed-check"
            onClick={() => st().mutate((d) => toggleDone(d, id, recurring ? (occ ?? undefined) : undefined))}
          >
            {done && <IconTick size={14} />}
          </button>
        </div>

        <div className="ed-chips">
          <button type="button" className={`chip${task.time ? ' is-set' : ''}`} disabled={!task.date} title={noDate} aria-expanded={pop === 'reminder'} onClick={() => toggle('reminder')}>
            <IconClock size={15} /> {task.time ?? 'Время'}
          </button>
          <button type="button" className={`chip${reminderLabel ? ' is-set' : ''}`} disabled={!task.date} title={noDate} onClick={() => toggle('reminder')}>
            <IconBell size={15} /> {reminderLabel ?? 'Напоминание'}
          </button>
          <button type="button" className={`chip${recurring ? ' is-set' : ''}`} disabled={!task.date} title={noDate} aria-expanded={pop === 'repeat'} onClick={() => toggle('repeat')}>
            <IconRepeat size={15} /> {recurring && task.date ? describeRecurrence(task.recurrence as Recurrence, task.date) : 'Повтор'}
          </button>
          <button type="button" className="chip" onClick={() => fileRef.current?.click()}>
            <IconClip size={15} /> Файл
          </button>
          <input ref={fileRef} type="file" multiple hidden aria-label="Добавить вложение" onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} />
          {(pop === 'reminder' || pop === 'repeat') && popEl}
        </div>

        <div className="ed-colors" role="radiogroup" aria-label="Цвет">
          <span className="ed-label" aria-hidden="true">Цвет</span>
          {TASK_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={task.color === c}
              aria-label={COLOR_LABELS[c]}
              title={COLOR_LABELS[c]}
              className={`swatch${c === 'none' ? ' none' : ''}`}
              style={{ background: c === 'none' ? undefined : MARKERS[c].bg }}
              onClick={() => patch({ color: c })}
            />
          ))}
        </div>

        <div className="ed-note-box">
          <AutoText className="ed-note" label="Заметка" placeholder="Добавьте подробности…" value={task.note} onChange={(v) => patch({ note: v })} />
          <Attachments task={task} />
        </div>

        <div className="ed-subs">
          <div className="ed-subs-head">
            <span>Подзадачи</span>
            {task.subtasks.length > 0 && <span className="ed-subs-count">{subsDone} из {task.subtasks.length}</span>}
          </div>
          {task.subtasks.length > 0 && (
            <div className="ed-subs-bar" aria-hidden="true"><span style={{ width: `${(subsDone / task.subtasks.length) * 100}%` }} /></div>
          )}
          <ul className="subtasks" aria-label="Подзадачи">
            {task.subtasks.map((s) => (
              <li key={s.id} className={s.done ? 'is-done' : ''}>
                <input
                  type="checkbox"
                  aria-label={s.title}
                  checked={s.done}
                  onChange={() => patch({ subtasks: task.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })}
                />
                <input
                  className="sub-title"
                  aria-label="Подзадача"
                  value={s.title}
                  onChange={(e) => patch({ subtasks: task.subtasks.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)) })}
                />
                <button type="button" className="icon-btn" aria-label={`Удалить подзадачу ${s.title}`} onClick={() => patch({ subtasks: task.subtasks.filter((x) => x.id !== s.id) })}>
                  <IconClose size={14} />
                </button>
              </li>
            ))}
          </ul>
          <div className="sub-add">
            <IconPlus size={18} />
            <input
              aria-label="Новая подзадача"
              placeholder="Добавить подзадачу"
              value={subText}
              onChange={(e) => setSubText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }}
              onBlur={addSub}
            />
          </div>
        </div>

        <div className="ed-moves">
          {moves.map((m) => (
            <button key={m.key} type="button" className="move" onClick={() => moveTo(m.to)}>{m.label}</button>
          ))}
          <button type="button" className="move primary" onClick={close}>Готово</button>
        </div>
      </div>
    </div>
  );
}
