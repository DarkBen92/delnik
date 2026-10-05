import { createContext, useContext } from 'react';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { AppData, ISODate, Settings, ViewMode } from '../domain/types';
import { addDays, addMonths, startOfWeek, todayISO } from '../domain/dates';
import { parseQuickInput } from '../domain/nlp';
import { addTask, rolloverTasks } from '../domain/tasks';
import { decodeShare, type CalendarSnapshot, importSnapshot } from '../domain/backup';
import { loadData, normalize, saveData } from './storage';

export type DialogState =
  | { kind: 'editor'; id: string; date: ISODate | null }
  | { kind: 'settings' }
  | { kind: 'stats' }
  | { kind: 'help' };

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'error';
}

export interface FocusTarget {
  taskId: string;
  title: string;
}

export type AddTarget = { date: ISODate } | { listId: string };

export interface AppState {
  data: AppData;
  today: ISODate;
  /** Любая дата в показываемом периоде. */
  anchor: ISODate;
  dialog: DialogState | null;
  searchOpen: boolean;
  stickerDay: ISODate | null;
  toasts: Toast[];
  focus: FocusTarget | null;
  pendingShare: CalendarSnapshot | null;

  mutate: (fn: (d: AppData) => AppData) => void;
  replaceData: (d: AppData) => void;
  setSettings: (patch: Partial<Settings>) => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  addFromInput: (text: string, target: AddTarget) => boolean;
  openEditor: (id: string, date?: ISODate | null) => void;
  openDialog: (d: DialogState | null) => void;
  closeDialog: () => void;
  setSearchOpen: (v: boolean) => void;
  setStickerDay: (d: ISODate | null) => void;
  setAnchor: (d: ISODate) => void;
  setView: (v: ViewMode) => void;
  shift: (dir: -1 | 1) => void;
  goToday: () => void;
  tickDay: () => void;
  doRollover: (manual?: boolean) => number;
  setFocus: (f: FocusTarget | null) => void;
  confirmShare: () => void;
  cancelShare: () => void;
}

export type AppStore = StoreApi<AppState>;

let toastSeq = 0;

export function shiftAnchor(anchor: ISODate, view: ViewMode, dir: -1 | 1): ISODate {
  if (view === 'week') return addDays(anchor, 7 * dir);
  if (view === 'month') return addMonths(anchor, dir);
  return addDays(anchor, dir);
}

/** Создаёт хранилище; каждое монтирование App читает localStorage заново. */
export function createAppStore(): AppStore {
  const today = todayISO();
  let data = loadData();
  const toasts: Toast[] = [];
  const pushToast = (text: string, tone: Toast['tone'] = 'info') => {
    toastSeq += 1;
    toasts.push({ id: toastSeq, text, tone });
  };

  if (data.settings.autoRollover && data.settings.lastRolloverDate !== today) {
    const r = rolloverTasks(data, today);
    data = { ...r.data, settings: { ...r.data.settings, lastRolloverDate: today } };
    if (r.moved > 0) pushToast(`Перенесено задач: ${r.moved}`);
    saveData(data);
  }

  let pendingShare: CalendarSnapshot | null = null;
  if (typeof location !== 'undefined' && location.hash.startsWith('#share=')) {
    try {
      pendingShare = decodeShare(location.hash.slice('#share='.length));
    } catch (e) {
      pushToast(`Не удалось открыть ссылку: ${e instanceof Error ? e.message : 'неверный формат'}`, 'error');
    }
    clearHash();
  }

  return createStore<AppState>()((set, get) => {
    const commit = (d: AppData) => {
      const n = normalize(d);
      saveData(n);
      set({ data: n });
    };
    return {
      data,
      today,
      anchor: today,
      dialog: null,
      searchOpen: false,
      stickerDay: null,
      toasts,
      focus: null,
      pendingShare,

      mutate: (fn) => commit(fn(get().data)),
      replaceData: (d) => commit(d),
      setSettings: (patch) => {
        const d = get().data;
        commit({ ...d, settings: { ...d.settings, ...patch } });
      },
      toast: (text, tone = 'info') => {
        toastSeq += 1;
        set((s) => ({ toasts: [...s.toasts, { id: toastSeq, text, tone }] }));
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      addFromInput: (text, target) => {
        const raw = text.trim();
        if (!raw) return false;
        const s = get();
        const q = parseQuickInput(raw, s.today);
        const title = q.title.trim() || raw;
        const cal = s.data.settings.activeCalendarId;
        let date: ISODate | null = q.date ?? ('date' in target ? target.date : null);
        if (!date && q.recurrence) date = s.today;
        const base = {
          calendarId: cal,
          title,
          time: q.time,
          recurrence: q.recurrence,
          color: q.color ?? ('none' as const),
        };
        const nt = date
          ? addTask(s.data, { ...base, date })
          : addTask(s.data, { ...base, listId: (target as { listId: string }).listId });
        commit(nt.data);
        return true;
      },
      openEditor: (id, date = null) => set({ dialog: { kind: 'editor', id, date }, searchOpen: false, stickerDay: null }),
      openDialog: (d) => set({ dialog: d, stickerDay: null }),
      closeDialog: () => set({ dialog: null }),
      setSearchOpen: (v) => set({ searchOpen: v }),
      setStickerDay: (d) => set({ stickerDay: d }),
      setAnchor: (d) => set({ anchor: d }),
      setView: (v) => get().setSettings({ view: v }),
      shift: (dir) => set((s) => ({ anchor: shiftAnchor(s.anchor, s.data.settings.view, dir) })),
      goToday: () => set((s) => ({ anchor: s.today })),
      tickDay: () => {
        const now = todayISO();
        const s = get();
        if (now === s.today) return;
        // если пользователь смотрел на текущую неделю — остаёмся на ней же («сегодня» сдвинулось)
        const followed = startOfWeek(s.anchor) === startOfWeek(s.today);
        set({ today: now, anchor: followed ? now : s.anchor });
        get().doRollover(false);
      },
      doRollover: (manual = true) => {
        const s = get();
        if (!manual && !(s.data.settings.autoRollover && s.data.settings.lastRolloverDate !== s.today)) return 0;
        const r = rolloverTasks(s.data, s.today);
        commit({ ...r.data, settings: { ...r.data.settings, lastRolloverDate: s.today } });
        if (r.moved > 0 || manual) get().toast(`Перенесено задач: ${r.moved}`);
        return r.moved;
      },
      setFocus: (f) => set({ focus: f }),
      confirmShare: () => {
        const snap = get().pendingShare;
        if (!snap) return;
        const r = importSnapshot(get().data, snap);
        commit({ ...r.data, settings: { ...r.data.settings, activeCalendarId: r.calendarId } });
        set({ pendingShare: null });
        get().toast(`Календарь «${snap.calendar.name}» добавлен`);
      },
      cancelShare: () => set({ pendingShare: null }),
    };
  });
}

function clearHash(): void {
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch {
    location.hash = '';
  }
  if (location.hash) location.hash = '';
}

export const StoreContext = createContext<AppStore | null>(null);

export function useApp<T>(selector: (s: AppState) => T): T {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreContext отсутствует');
  return useStore(store, selector);
}

export function useAppStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreContext отсутствует');
  return store;
}

export function activeCalendarId(d: AppData): string {
  return d.settings.activeCalendarId;
}
