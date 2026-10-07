import { useEffect, useRef, useState, type ReactNode } from 'react';
import { encodeShare, parseBackup, serializeBackup, snapshotCalendar } from '../domain/backup';
import { startOfWeek, weekRangeLabel } from '../domain/dates';
import { exportICS, parseICS } from '../domain/ics';
import { addCalendar, addTask, deleteCalendar, renameCalendar } from '../domain/tasks';
import type { Calendar, CustomTheme, ThemeMode } from '../domain/types';
import { useApp, useAppStore } from '../store/store';
import {
  IconCalendar, IconChart, IconClose, IconKeyboard, IconPage, IconPrint, IconSearch,
} from './icons';
import { useIsDark } from './hooks';
import { downloadBlob, plural, readText } from './util';

/** Базовые цвета тем — их показывают пипетки, пока свой цвет не выбран. */
const BASE_COLORS: Record<'light' | 'dark', Required<CustomTheme>> = {
  light: { accent: '#eb5a0c', background: '#ffffff', paper: '#e3e6fd', text: '#000000' },
  dark: { accent: '#eb5a0c', background: '#111111', paper: '#24263a', text: '#f2f2f2' },
};

function Tile({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="tile" onClick={onClick}>
      <span className="tile-icon" aria-hidden="true">{icon}</span>
      <span>{label}</span>
      <span className="tile-arrow" aria-hidden="true">↗</span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="menu-sec">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function CalendarRow({ cal, active, canDelete }: { cal: Calendar; active: boolean; canDelete: boolean }) {
  const store = useAppStore();
  const [name, setName] = useState(cal.name);
  useEffect(() => setName(cal.name), [cal.name]);
  return (
    <li className={`cal-row${active ? ' is-active' : ''}`}>
      <input
        type="radio"
        name="active-calendar"
        aria-label={`Открыть календарь «${cal.name}»`}
        checked={active}
        onChange={() => store.getState().setSettings({ activeCalendarId: cal.id })}
      />
      <input
        type="color"
        className="cal-color"
        aria-label={`Цвет календаря «${cal.name}»`}
        value={cal.color}
        onChange={(e) => {
          const color = e.target.value;
          store.getState().mutate((d) => ({ ...d, calendars: d.calendars.map((c) => (c.id === cal.id ? { ...c, color } : c)) }));
        }}
      />
      <input
        className="cal-name-input"
        aria-label="Название календаря"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const t = name.trim();
          if (t && t !== cal.name) store.getState().mutate((d) => renameCalendar(d, cal.id, t));
          else setName(cal.name);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />
      {canDelete && (
        <button
          type="button"
          className="icon-btn"
          aria-label={`Удалить календарь «${cal.name}»`}
          onClick={() => {
            if (typeof window.confirm === 'function' && !window.confirm(`Удалить календарь «${cal.name}» со всеми задачами?`)) return;
            store.getState().mutate((d) => deleteCalendar(d, cal.id));
          }}
        >
          <IconClose size={14} />
        </button>
      )}
    </li>
  );
}

export function Menu() {
  const store = useAppStore();
  const data = useApp((s) => s.data);
  const anchor = useApp((s) => s.anchor);
  const [newCal, setNewCal] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const s = data.settings;
  const dark = useIsDark();
  const st = () => store.getState();
  const close = () => st().closeDialog();
  const active = data.calendars.find((c) => c.id === s.activeCalendarId) ?? data.calendars[0];

  useEffect(() => { panel.current?.focus(); }, []);

  const print = (blank: boolean) => {
    close();
    document.body.classList.toggle('print-blank', blank);
    setTimeout(() => {
      if (typeof window.print === 'function') window.print();
      document.body.classList.remove('print-blank');
    }, 50);
  };

  const share = async () => {
    const code = encodeShare(snapshotCalendar(data, active.id));
    const url = `${location.origin}${location.pathname}#share=${code}`;
    setShareUrl(url);
    try {
      await navigator.clipboard?.writeText(url);
      st().toast('Ссылка скопирована');
    } catch { /* покажем ссылку в поле */ }
  };

  // Цвета правим у той темы, что сейчас на экране; храним только изменённые.
  const themeKey = dark ? 'customThemeDark' : 'customTheme';
  const custom = s[themeKey] ?? null;
  const base = BASE_COLORS[dark ? 'dark' : 'light'];
  const setTheme = (patch: CustomTheme) => st().setSettings({ [themeKey]: { ...(custom ?? {}), ...patch } });

  return (
    <div className="overlay clear" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Меню" className="menu">
        <div className="menu-head">
          <div>
            <div className="menu-title">Дельник</div>
            <div className="menu-plan">Все возможности открыты · бесплатно</div>
          </div>
          <button type="button" className="round soft" aria-label="Закрыть" onClick={close}><IconClose /></button>
        </div>

        <div className="tiles">
          <Tile icon={<IconChart />} label="Итоги" onClick={() => st().openDialog({ kind: 'stats' })} />
          <Tile icon={<IconSearch />} label="Поиск" onClick={() => { close(); st().setSearchOpen(true); }} />
          <Tile icon={<IconCalendar />} label="Месяц" onClick={() => st().openDialog({ kind: 'month' })} />
          <Tile icon={<IconPrint />} label="Печать недели" onClick={() => print(false)} />
          <Tile icon={<IconPage />} label="Пустой бланк" onClick={() => print(true)} />
          <Tile icon={<IconKeyboard />} label="Клавиши" onClick={() => st().openDialog({ kind: 'help' })} />
        </div>

        <Section title="Календари">
          <ul className="cal-list">
            {data.calendars.map((c) => (
              <CalendarRow key={c.id} cal={c} active={c.id === active.id} canDelete={data.calendars.length > 1} />
            ))}
          </ul>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              const t = newCal.trim();
              if (!t) return;
              const r = addCalendar(st().data, t);
              st().replaceData({ ...r.data, settings: { ...r.data.settings, activeCalendarId: r.id } });
              setNewCal('');
            }}
          >
            <input aria-label="Название нового календаря" placeholder="Новый календарь" value={newCal} onChange={(e) => setNewCal(e.target.value)} />
            <button type="submit" className="pill-btn">Добавить</button>
          </form>
          <div className="btn-row">
            <button type="button" className="pill-btn" onClick={() => void share()}>Поделиться ссылкой</button>
          </div>
          {shareUrl && (
            <input className="share-url" aria-label="Ссылка на копию календаря" readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} />
          )}
        </Section>

        <Section title="Оформление">
          <div className="seg" role="radiogroup" aria-label="Тема">
            {([['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Как в системе']] as [ThemeMode, string][]).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={s.theme === v} className={s.theme === v ? 'on' : ''} onClick={() => st().setSettings({ theme: v })}>
                {label}
              </button>
            ))}
          </div>
          <div className="theme-colors">
            {([['background', 'Фон'], ['text', 'Текст'], ['accent', 'Акцент'], ['paper', 'Окна']] as [keyof CustomTheme, string][]).map(([k, label]) => (
              <label key={k}>
                <input type="color" aria-label={`Цвет: ${label}`} value={custom?.[k] ?? base[k]} onChange={(e) => setTheme({ [k]: e.target.value })} />
                <span>{label}</span>
              </label>
            ))}
            {custom && <button type="button" className="link-btn" onClick={() => st().setSettings({ [themeKey]: null })}>Сбросить</button>}
          </div>
        </Section>

        <Section title="Поведение">
          {([
            ['hideCompleted', 'Скрывать выполненные'],
            ['autoRollover', 'Переносить невыполненные на сегодня'],
            ['showHolidays', 'Праздники и сокращённые дни РФ'],
          ] as const).map(([k, label]) => (
            <label key={k} className="switch">
              <input type="checkbox" checked={s[k]} onChange={(e) => st().setSettings({ [k]: e.target.checked })} />
              <span>{label}</span>
            </label>
          ))}
          <label className="switch">
            <input
              type="checkbox"
              checked={s.notifications}
              onChange={async (e) => {
                const on = e.target.checked;
                if (on && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
                  const p = await Notification.requestPermission().catch(() => 'denied' as NotificationPermission);
                  if (p !== 'granted') { st().toast('Браузер не разрешил уведомления', 'error'); return; }
                }
                st().setSettings({ notifications: on });
              }}
            />
            <span>Уведомления о напоминаниях</span>
          </label>
        </Section>

        <Section title="Данные">
          <div className="btn-row">
            <button type="button" className="pill-btn" onClick={() => downloadBlob(`delnik-${st().today}.json`, serializeBackup(st().data), 'application/json')}>Скачать копию</button>
            <label className="pill-btn file">
              Восстановить
              <input
                type="file"
                accept="application/json,.json"
                aria-label="Восстановить из копии"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  try {
                    const d = parseBackup(await readText(f));
                    if (typeof window.confirm === 'function' && !window.confirm('Заменить все текущие данные копией?')) return;
                    st().replaceData(d);
                    st().toast('Данные восстановлены');
                  } catch (err) {
                    st().toast(err instanceof Error ? err.message : 'Не удалось прочитать файл', 'error');
                  }
                }}
              />
            </label>
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="pill-btn"
              onClick={() => downloadBlob(`${active.name}.ics`, exportICS(data.tasks.filter((t) => t.calendarId === active.id), active.name), 'text/calendar')}
            >
              Экспорт .ics
            </button>
            <label className="pill-btn file">
              Импорт .ics
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
                    let d = st().data;
                    for (const t of drafts) {
                      if (!t.date) continue;
                      d = addTask(d, { ...t, calendarId: active.id, date: t.date }).data;
                    }
                    st().replaceData(d);
                    st().toast(`Импортировано ${drafts.length} ${plural(drafts.length, ['событие', 'события', 'событий'])}`);
                  } catch {
                    st().toast('Не удалось прочитать .ics', 'error');
                  }
                }}
              />
            </label>
          </div>
          <p className="menu-note">
            Данные хранятся на этом устройстве. Файл .ics подходит для Google, Apple и Outlook календарей.
          </p>
        </Section>
        <p className="menu-foot">Неделя {weekRangeLabel(startOfWeek(anchor))}</p>
      </div>
    </div>
  );
}
