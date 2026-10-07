import { useEffect, useLayoutEffect, useState } from 'react';
import { dueReminders } from '../domain/reminders';
import { useApp, useAppStore } from '../store/store';
import { isTypingTarget, inkFor } from './util';
import { systemNotify } from './notify';

/** Тёмная ли тема сейчас: выбрана явно или «как в системе» при тёмной системе. */
export function useIsDark(): boolean {
  const theme = useApp((s) => s.data.settings.theme);
  const [sysDark, setSysDark] = useState(() => (typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false));
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setSysDark(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return theme === 'dark' || (theme === 'system' && sysDark);
}

/** data-theme и переопределение CSS-переменных своей темы (у светлой и тёмной — свои цвета). */
export function useTheme(): void {
  const dark = useIsDark();
  const custom = useApp((s) => (dark ? s.data.settings.customThemeDark : s.data.settings.customTheme));
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = dark ? 'dark' : 'light';
    const vars: Record<string, string | undefined> = {
      '--accent': custom?.accent,
      '--accent-ink': custom?.accent ? inkFor(custom.accent) : undefined,
      '--bg': custom?.background,
      '--paper': custom?.paper,
      '--text': custom?.text,
    };
    for (const [k, v] of Object.entries(vars)) {
      if (v) root.style.setProperty(k, v);
      else root.style.removeProperty(k);
    }
  }, [dark, custom]);
}

/** Раз в 30 с: напоминания и смена дня. */
export function useTicker(): void {
  const store = useAppStore();
  useEffect(() => {
    let last = Date.now();
    const h = setInterval(() => {
      const now = Date.now();
      const st = store.getState();
      try {
        for (const r of dueReminders(st.data, last, now)) {
          const when = r.task.time ? ` (${r.task.time})` : '';
          st.toast(`Напоминание: ${r.task.title}${when}`);
          systemNotify(st.data.settings.notifications, r.task.title, r.task.time ? `Сегодня в ${r.task.time}` : 'Напоминание');
        }
      } finally {
        last = now;
      }
      st.tickDay();
    }, 30_000);
    return () => clearInterval(h);
  }, [store]);
}

export function useShortcuts(): void {
  const store = useAppStore();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = store.getState();
      if (e.key === 'Escape') {
        if (st.stickerDay) st.setStickerDay(null);
        else if (st.pendingShare) st.cancelShare();
        else if (st.dialog) st.closeDialog();
        else if (st.searchOpen) st.setSearchOpen(false);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target) || st.dialog || st.pendingShare || st.stickerDay) return;
      const key = e.key;
      const lower = key.toLowerCase();
      if (key === 'ArrowLeft') { e.preventDefault(); st.shift(-1); }
      else if (key === 'ArrowRight') { e.preventDefault(); st.shift(1); }
      else if (e.code === 'KeyT' || lower === 't' || lower === 'е') { e.preventDefault(); st.goToday(); }
      else if (key === '/') { e.preventDefault(); st.setSearchOpen(true); }
      else if (key === '?') { e.preventDefault(); st.openDialog({ kind: 'help' }); }
      else if (e.code === 'KeyN' || lower === 'n' || lower === 'т') {
        e.preventDefault();
        // Сначала — строка быстрого ввода, без неё — строка «новая задача» в сегодняшнем дне.
        const quick = document.querySelector<HTMLInputElement>('#quick-input');
        if (quick) { quick.focus(); return; }
        const focusToday = () => {
          const el = document.querySelector<HTMLInputElement>('section.day[aria-current="date"] input.new-task');
          if (el) { el.focus(); return true; }
          return false;
        };
        if (!focusToday()) {
          st.goToday();
          setTimeout(focusToday, 30);
        }
      }
      else if (e.code === 'KeyM' || lower === 'm' || lower === 'ь') { e.preventDefault(); st.openDialog({ kind: 'month' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store]);
}
