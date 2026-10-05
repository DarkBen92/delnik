import { useState } from 'react';
import { describeRecurrence } from '../domain/recurrence';
import { isoWeekday } from '../domain/dates';
import { makeId } from '../domain/ids';
import { deleteTask, moveTask, skipOccurrence, updateTask } from '../domain/tasks';
import { TASK_COLORS, type Recurrence, type RecurrenceFreq, type Task, type Weekday } from '../domain/types';
import { deleteFile, getFile, putFile } from '../store/files';
import { useApp, useAppStore } from '../store/store';
import { Dialog } from './Dialog';
import { COLOR_LABELS, downloadBlob, formatBytes, REMINDER_OPTIONS, WEEKDAYS, WEEKDAY_SHORT } from './util';

const FREQ_OPTIONS: { value: 'none' | RecurrenceFreq; label: string }[] = [
  { value: 'none', label: 'Нет' },
  { value: 'daily', label: 'Дни' },
  { value: 'weekly', label: 'Недели' },
  { value: 'monthly', label: 'Месяцы' },
  { value: 'yearly', label: 'Годы' },
];
const UNIT: Record<RecurrenceFreq, string> = { daily: 'дн.', weekly: 'нед.', monthly: 'мес.', yearly: 'лет' };

export function Editor({ id, occDate }: { id: string; occDate: string | null }) {
  const store = useAppStore();
  const task = useApp((s) => s.data.tasks.find((t) => t.id === id));
  const lists = useApp((s) => s.data.lists);
  const today = useApp((s) => s.today);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sub, setSub] = useState('');
  if (!task) return null;

  const st = () => store.getState();
  const patch = (p: Partial<Task>) => st().mutate((d) => updateTask(d, id, p));
  const close = () => {
    if (task.title.trim() === '') patch({ title: 'Без названия' });
    st().closeDialog();
  };
  const rec = task.recurrence;
  const calLists = lists.filter((l) => l.calendarId === task.calendarId).sort((a, b) => a.order - b.order);

  const setFreq = (v: string) => {
    if (v === 'none') { patch({ recurrence: null }); return; }
    const freq = v as RecurrenceFreq;
    const base: Recurrence = { freq, interval: rec?.interval ?? 1, until: rec?.until ?? null };
    if (freq === 'weekly') base.weekdays = rec?.weekdays?.length ? rec.weekdays : [isoWeekday(task.date ?? today)];
    patch({ recurrence: base });
  };
  const toggleWd = (w: Weekday) => {
    if (!rec) return;
    const cur = rec.weekdays ?? [];
    const next = cur.includes(w) ? cur.filter((x) => x !== w) : [...cur, w].sort();
    patch({ recurrence: { ...rec, weekdays: next } });
  };

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const aid = makeId();
      try {
        await putFile(aid, f);
        st().mutate((d) => {
          const t = d.tasks.find((x) => x.id === id);
          return t ? updateTask(d, id, { attachments: [...t.attachments, { id: aid, name: f.name, size: f.size, type: f.type }] }) : d;
        });
      } catch (e) {
        st().toast(e instanceof Error ? e.message : 'Не удалось сохранить файл', 'error');
      }
    }
  };

  const doDelete = (mode: 'one' | 'all') => {
    const date = occDate ?? task.date;
    task.attachments.forEach((a) => { if (mode === 'all') void deleteFile(a.id).catch(() => undefined); });
    st().mutate((d) => (mode === 'one' && date ? skipOccurrence(d, id, date) : deleteTask(d, id)));
    st().closeDialog();
  };

  return (
    <Dialog label="Задача" onClose={close} wide>
      <label className="field">
        <span>Название</span>
        <input type="text" aria-label="Название" value={task.title} onChange={(e) => patch({ title: e.target.value })} />
      </label>
      <label className="field">
        <span>Заметка</span>
        <textarea aria-label="Заметка" rows={3} value={task.note} onChange={(e) => patch({ note: e.target.value })} />
      </label>

      <div className="field">
        <span id="color-lbl">Цвет</span>
        <div className="colors" role="radiogroup" aria-labelledby="color-lbl">
          {TASK_COLORS.map((c) => (
            <label key={c} className="swatch" data-color={c} title={COLOR_LABELS[c]}>
              <input type="radio" name="task-color" aria-label={COLOR_LABELS[c]} checked={task.color === c} onChange={() => patch({ color: c })} />
              <span />
            </label>
          ))}
        </div>
      </div>

      <div className="grid2">
        <label className="field">
          <span>Дата</span>
          <input
            type="date"
            aria-label="Дата"
            value={task.date ?? ''}
            onChange={(e) => { const v = e.target.value; if (v) st().mutate((d) => moveTask(d, id, { date: v })); }}
          />
        </label>
        <label className="field">
          <span>Список</span>
          <select
            aria-label="Список"
            value={task.listId ?? ''}
            disabled={!!rec}
            onChange={(e) => {
              const v = e.target.value;
              st().mutate((d) => moveTask(d, id, v ? { listId: v } : { date: today }));
            }}
          >
            <option value="">— в календаре —</option>
            {calLists.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Время</span>
          <input
            type="time"
            aria-label="Время"
            value={task.time ?? ''}
            onChange={(e) => patch({ time: e.target.value || null, ...(e.target.value ? {} : { reminder: null }) })}
          />
        </label>
        <label className="field">
          <span>Напоминание</span>
          <select
            aria-label="Напоминание"
            value={task.reminder === null ? '' : String(task.reminder)}
            disabled={!task.time}
            onChange={(e) => patch({ reminder: e.target.value === '' ? null : Number(e.target.value) })}
          >
            {REMINDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>

      <fieldset className="field">
        <legend>Повторение</legend>
        <label className="inline">
          <span>Повтор</span>
          <select aria-label="Повтор" value={rec?.freq ?? 'none'} disabled={!task.date} onChange={(e) => setFreq(e.target.value)}>
            {FREQ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        {!task.date && <p className="muted">Повтор доступен для задач с датой.</p>}
        {rec && (
          <>
            <label className="inline">
              <span>Каждые</span>
              <input
                type="number"
                aria-label="Интервал повтора"
                min={1}
                className="num"
                value={rec.interval}
                onChange={(e) => patch({ recurrence: { ...rec, interval: Math.max(1, Math.floor(Number(e.target.value)) || 1) } })}
              />
              <span>{UNIT[rec.freq]}</span>
            </label>
            {rec.freq === 'weekly' && (
              <div className="wdays" role="group" aria-label="Дни недели">
                {WEEKDAYS.map((w) => (
                  <label key={w} className="wday">
                    <input type="checkbox" aria-label={WEEKDAY_SHORT[w]} checked={(rec.weekdays ?? []).includes(w)} onChange={() => toggleWd(w)} />
                    <span aria-hidden="true">{WEEKDAY_SHORT[w]}</span>
                  </label>
                ))}
              </div>
            )}
            <label className="inline">
              <span>Повторять до</span>
              <input type="date" aria-label="Повторять до" value={rec.until ?? ''} onChange={(e) => patch({ recurrence: { ...rec, until: e.target.value || null } })} />
            </label>
            <p className="preview" data-testid="recurrence-preview">{describeRecurrence(rec, task.date ?? today)}</p>
          </>
        )}
      </fieldset>

      <fieldset className="field">
        <legend>Подзадачи</legend>
        <ul className="subs">
          {task.subtasks.map((s) => (
            <li key={s.id}>
              <input
                type="checkbox"
                aria-label={s.title}
                checked={s.done}
                onChange={() => patch({ subtasks: task.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })}
              />
              <span className={s.done ? 'is-done' : ''}>{s.title}</span>
              <button type="button" className="icon-btn small" aria-label={`Удалить подзадачу «${s.title}»`} onClick={() => patch({ subtasks: task.subtasks.filter((x) => x.id !== s.id) })}>×</button>
            </li>
          ))}
        </ul>
        <input
          type="text"
          aria-label="Новая подзадача"
          placeholder="Добавить подзадачу"
          value={sub}
          onChange={(e) => setSub(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              const t = sub.trim();
              if (t) { patch({ subtasks: [...task.subtasks, { id: makeId(), title: t, done: false }] }); setSub(''); }
            }
          }}
        />
      </fieldset>

      <fieldset className="field">
        <legend>Вложения</legend>
        <ul className="subs">
          {task.attachments.map((a) => (
            <li key={a.id}>
              <span className="grow">{a.name} <span className="muted">({formatBytes(a.size)})</span></span>
              <button
                type="button"
                className="btn small"
                aria-label={`Скачать «${a.name}»`}
                onClick={async () => {
                  try {
                    const b = await getFile(a.id);
                    if (b) downloadBlob(a.name, b, a.type);
                    else st().toast('Файл не найден в хранилище', 'error');
                  } catch { st().toast('Не удалось прочитать файл', 'error'); }
                }}
              >Скачать</button>
              <button
                type="button"
                className="icon-btn small"
                aria-label={`Удалить вложение «${a.name}»`}
                onClick={() => { void deleteFile(a.id).catch(() => undefined); patch({ attachments: task.attachments.filter((x) => x.id !== a.id) }); }}
              >×</button>
            </li>
          ))}
        </ul>
        <input type="file" multiple aria-label="Добавить вложение" onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} />
        <p className="muted">Файлы хранятся только в этом браузере, до 10 МБ каждый.</p>
      </fieldset>

      <div className="row spread">
        <button type="button" className="btn" onClick={() => { st().setFocus({ taskId: id, title: task.title }); st().closeDialog(); }}>Фокус</button>
        {confirmDelete ? (
          <span className="row">
            {rec ? (
              <>
                <button type="button" className="btn danger" onClick={() => doDelete('one')}>Только это</button>
                <button type="button" className="btn danger" onClick={() => doDelete('all')}>Всю серию</button>
              </>
            ) : (
              <button type="button" className="btn danger" onClick={() => doDelete('all')}>Да, удалить</button>
            )}
            <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>Отмена</button>
          </span>
        ) : (
          <button
            type="button"
            className="btn danger"
            onClick={() => (rec ? setConfirmDelete(true) : doDelete('all'))}
          >Удалить</button>
        )}
      </div>
    </Dialog>
  );
}
