import { useEffect, useRef, useState } from 'react';
import { useApp, useAppStore } from '../store/store';
import { systemNotify } from './notify';

const WORK = 25 * 60;
const BREAK = 5 * 60;
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function FocusTimer() {
  const store = useAppStore();
  const focus = useApp((s) => s.focus);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [left, setLeft] = useState(WORK);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);

  useEffect(() => {
    setMode('work'); setLeft(WORK); setRunning(false);
  }, [focus?.taskId]);

  useEffect(() => {
    if (!running) return undefined;
    const h = setInterval(() => {
      const rest = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(rest);
      if (rest === 0) {
        clearInterval(h);
        setRunning(false);
        const next = mode === 'work' ? 'break' : 'work';
        const msg = mode === 'work' ? 'Время отдохнуть: перерыв 5 минут' : 'Перерыв окончен — за работу';
        store.getState().toast(msg);
        systemNotify(store.getState().data.settings.notifications, 'Фокус', msg);
        setMode(next);
        setLeft(next === 'work' ? WORK : BREAK);
      }
    }, 500);
    return () => clearInterval(h);
  }, [running, mode, store]);

  if (!focus) return null;
  const start = () => { endAt.current = Date.now() + left * 1000; setRunning(true); };
  return (
    <div className="focus no-print" role="timer" aria-label="Фокус-таймер">
      <div className="focus-mode">{mode === 'work' ? 'Работа' : 'Перерыв'}</div>
      <div className="focus-title">{focus.title}</div>
      <div className="focus-time">{fmt(left)}</div>
      <div className="row">
        {running
          ? <button type="button" className="btn" onClick={() => setRunning(false)}>Пауза</button>
          : <button type="button" className="btn primary" onClick={start}>Старт</button>}
        <button type="button" className="btn" onClick={() => { setRunning(false); setLeft(mode === 'work' ? WORK : BREAK); }}>Сброс</button>
        <button type="button" className="btn" onClick={() => store.getState().setFocus(null)} aria-label="Закрыть таймер">Закрыть</button>
      </div>
    </div>
  );
}
