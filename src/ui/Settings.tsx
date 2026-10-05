import { useState } from 'react';
import { encodeShare, parseBackup, serializeBackup, snapshotCalendar } from '../domain/backup';
import { exportICS, parseICS } from '../domain/ics';
import { addCalendar, addTask, deleteCalendar, renameCalendar } from '../domain/tasks';
import type { AppData, Calendar, CustomTheme, ThemeMode } from '../domain/types';
import { useApp, useAppStore } from '../store/store';
import { Dialog } from './Dialog';
import { downloadBlob, readText } from './util';

export const DEFAULT_CUSTOM: Record<'light' | 'dark', CustomTheme> = {
  light: { accent: '#1f7a6d', background: '#f3ece0', paper: '#fffdf8', text: '#2a2620' },
  dark: { accent: '#4fb9a8', background: '#171512', paper: '#201d19', text: '#ece6da' },
};

function CalendarRow({ cal, canDelete }: { cal: Calendar; canDelete: boolean }) {
  const store = useAppStore();
  const [name, setName] = useState(cal.name);
  const [confirm, setConfirm] = useState(false);
  const commit = () => {
    const t = name.trim();
    if (t && t !== cal.name) store.getState().mutate((d) => renameCalendar(d, cal.id, t));
    else setName(cal.name);
  };
  return (
    <li className="cal-row">
      <input
        type="color"
        aria-label={`Цвет календаря «${cal.name}»`}
        value={/^#[0-9a-f]{6}$/i.test(cal.color) ? cal.color : '#4f9d69'}
        onChange={(e) => store.getState().mutate((d) => ({ ...d, calendars: d.calendars.map((c) => (c.id === cal.id ? { ...c, color: e.target.value } : c)) }))}
      />
      <input
        type="text"
        className="grow"
        aria-label={`Название календаря «${cal.name}»`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
      />
      {confirm ? (
        <>
          <button type="button" className="btn danger small" onClick={() => { store.getState().mutate((d) => deleteCalendar(d, cal.id)); setConfirm(false); }}>Удалить со всеми задачами</button>
          <button type="button" className="btn small" onClick={() => setConfirm(false)}>Нет</button>
        </>
      ) : (
        <button type="button" className="btn small" disabled={!canDelete} title={canDelete ? undefined : 'Нельзя удалить последний календарь'} onClick={() => setConfirm(true)} aria-label={`Удалить календарь «${cal.name}»`}>Удалить</button>
      )}
    </li>
  );
}

export function SettingsDialog() {
  const store = useAppStore();
  const data = useApp((s) => s.data);
  const s = data.settings;
  const st = () => store.getState();
  const [newCal, setNewCal] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [report, setReport] = useState('');
  const [restore, setRestore] = useState<AppData | null>(null);
  const cal = data.calendars.find((c) => c.id === s.activeCalendarId) ?? data.calendars[0];
  const dark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';
  const base = DEFAULT_CUSTOM[dark ? 'dark' : 'light'];
  const ct = s.customTheme ?? base;
  const setColor = (k: keyof CustomTheme, v: string) => st().setSettings({ customTheme: { ...ct, [k]: v } });

  const askNotifications = async (on: boolean) => {
    if (!on) { st().setSettings({ notifications: false }); return; }
    if (typeof Notification === 'undefined') {
      st().toast('Этот браузер не поддерживает системные уведомления; напоминания будут появляться внутри приложения.', 'error');
      return;
    }
    try {
      const res = await Notification.requestPermission();
      if (res === 'granted') { st().setSettings({ notifications: true }); st().toast('Уведомления включены'); }
      else st().toast('Разрешение на уведомления не выдано', 'error');
    } catch {
      st().toast('Не удалось запросить разрешение на уведомления', 'error');
    }
  };

  const print = (blank: boolean) => {
    st().setView('week');
    st().closeDialog();
    document.body.classList.toggle('print-blank', blank);
    const after = () => { document.body.classList.remove('print-blank'); window.removeEventListener('afterprint', after); };
    window.addEventListener('afterprint', after);
    setTimeout(() => { try { window.print(); } catch { after(); } }, 80);
  };

  const share = async () => {
    const url = `${location.origin}${location.pathname}#share=${encodeShare(snapshotCalendar(data, cal.id))}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      st().toast('Ссылка скопирована в буфер обмена');
    } catch {
      st().toast('Скопируйте ссылку вручную из поля ниже');
    }
  };

  return (
    <Dialog label="Настройки" onClose={() => st().closeDialog()} wide>
      <section className="set-sec">
        <h3>Оформление</h3>
        <label className="inline">
          <span>Тема</span>
          <select aria-label="Тема" value={s.theme} onChange={(e) => st().setSettings({ theme: e.target.value as ThemeMode })}>
            <option value="system">Как в системе</option>
            <option value="light">Светлая</option>
            <option value="dark">Тёмная</option>
          </select>
        </label>
        <div className="custom-theme">
          <strong>Своя тема</strong>
          <label className="inline"><span>Акцент</span><input type="color" aria-label="Акцент" value={ct.accent} onChange={(e) => setColor('accent', e.target.value)} /></label>
          <label className="inline"><span>Фон</span><input type="color" aria-label="Фон" value={ct.background} onChange={(e) => setColor('background', e.target.value)} /></label>
          <label className="inline"><span>Бумага</span><input type="color" aria-label="Бумага" value={ct.paper} onChange={(e) => setColor('paper', e.target.value)} /></label>
          <label className="inline"><span>Текст</span><input type="color" aria-label="Текст" value={ct.text} onChange={(e) => setColor('text', e.target.value)} /></label>
          <button type="button" className="btn small" disabled={!s.customTheme} onClick={() => st().setSettings({ customTheme: null })}>Сбросить тему</button>
        </div>
      </section>

      <section className="set-sec">
        <h3>Поведение</h3>
        <label className="check"><input type="checkbox" checked={s.showCompleted} onChange={(e) => st().setSettings({ showCompleted: e.target.checked })} /> Показывать выполненные</label>
        <label className="check"><input type="checkbox" checked={s.autoRollover} onChange={(e) => st().setSettings({ autoRollover: e.target.checked })} /> Переносить невыполненные на сегодня</label>
        <label className="check"><input type="checkbox" checked={s.showHolidays} onChange={(e) => st().setSettings({ showHolidays: e.target.checked })} /> Подсвечивать праздники РФ</label>
        <label className="check"><input type="checkbox" checked={s.notifications} onChange={(e) => { void askNotifications(e.target.checked); }} /> Уведомления</label>
      </section>

      <section className="set-sec">
        <h3>Календари</h3>
        <ul className="cals">
          {data.calendars.map((c) => <CalendarRow key={c.id} cal={c} canDelete={data.calendars.length > 1} />)}
        </ul>
        <div className="row">
          <input type="text" className="grow" aria-label="Название нового календаря" placeholder="Например: Работа" value={newCal} onChange={(e) => setNewCal(e.target.value)} />
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              const n = newCal.trim();
              if (!n) return;
              const r = addCalendar(data, n);
              st().replaceData({ ...r.data, settings: { ...r.data.settings, activeCalendarId: r.id } });
              setNewCal('');
            }}
          >Добавить календарь</button>
        </div>
      </section>

      <section className="set-sec">
        <h3>Резервная копия</h3>
        <div className="row">
          <button type="button" className="btn" onClick={() => downloadBlob('delnik-backup.json', serializeBackup(data), 'application/json')}>Скачать копию</button>
          <label className="file-btn">
            <span>Восстановить</span>
            <input
              type="file"
              accept="application/json,.json"
              aria-label="Восстановить из копии"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try { setRestore(parseBackup(await readText(f))); } catch (err) { st().toast(err instanceof Error ? err.message : 'Файл не похож на копию Дельника', 'error'); }
              }}
            />
          </label>
        </div>
        {restore && (
          <div className="confirm-box" role="alert">
            <p>Заменить все текущие данные копией ({restore.tasks.length} задач, календарей: {restore.calendars.length})?</p>
            <div className="row">
              <button type="button" className="btn danger" onClick={() => { st().replaceData({ ...restore, settings: { ...restore.settings } }); setRestore(null); st().toast('Данные восстановлены'); }}>Заменить</button>
              <button type="button" className="btn" onClick={() => setRestore(null)}>Отмена</button>
            </div>
          </div>
        )}
      </section>

      <section className="set-sec">
        <h3>Календарь .ics</h3>
        <div className="row">
          <button type="button" className="btn" onClick={() => downloadBlob(`${cal.name}.ics`, exportICS(data.tasks.filter((t) => t.calendarId === cal.id), cal.name), 'text/calendar')}>Экспорт .ics</button>
          <label className="file-btn">
            <span>Импорт</span>
            <input
              type="file"
              accept=".ics,text/calendar"
              aria-label="Импорт .ics"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  const drafts = parseICS(await readText(f));
                  const list = data.lists.find((l) => l.calendarId === cal.id);
                  let next = data;
                  let n = 0;
                  for (const dr of drafts) {
                    const base = { calendarId: cal.id, title: dr.title, note: dr.note, time: dr.time, recurrence: dr.recurrence };
                    if (dr.date) next = addTask(next, { ...base, date: dr.date }).data;
                    else if (list) next = addTask(next, { ...base, listId: list.id }).data;
                    else continue;
                    n += 1;
                  }
                  st().replaceData(next);
                  setReport(`Импортировано ${n}`);
                } catch (err) {
                  st().toast(err instanceof Error ? err.message : 'Не удалось прочитать .ics', 'error');
                }
              }}
            />
          </label>
        </div>
        {report && <p role="status" className="muted">{report}</p>}
      </section>

      <section className="set-sec">
        <h3>Поделиться и напечатать</h3>
        <div className="row">
          <button type="button" className="btn" onClick={() => { void share(); }}>Поделиться ссылкой</button>
          <button type="button" className="btn" onClick={() => print(false)}>Печать недели</button>
          <button type="button" className="btn" onClick={() => print(true)}>Печать пустого шаблона</button>
        </div>
        {shareUrl && (
          <input type="text" readOnly aria-label="Ссылка на календарь" value={shareUrl} onFocus={(e) => e.currentTarget.select()} />
        )}
        <p className="muted">Ссылка содержит снимок календаря «{cal.name}» (без вложений). Получатель увидит копию.</p>
      </section>
    </Dialog>
  );
}
