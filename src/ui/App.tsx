import { useRef, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, pointerWithin,
  useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { startOfWeek, weekRangeLabel } from '../domain/dates';
import { moveTask, tasksForDay, tasksForList } from '../domain/tasks';
import type { AppData } from '../domain/types';
import { StoreContext, createAppStore, useApp, useAppStore, type AppStore } from '../store/store';
import { Editor } from './Editor';
import { FocusTimer } from './FocusTimer';
import { Header } from './Header';
import { HelpDialog, SearchPanel, ShareConfirm, StatsDialog, StickerPicker, Toasts } from './Panels';
import { SettingsDialog } from './Settings';
import { TaskBody, itemId } from './TaskItem';
import { DayView, MonthView, WeekView } from './Views';
import { useShortcuts, useTheme, useTicker } from './hooks';
import './styles.css';

const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const navHit = hits.find((h) => String(h.id).startsWith('nav:'));
  if (navHit) return [navHit];
  const rest = closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => !String(c.id).startsWith('nav:')) });
  return rest;
};

function containerIds(data: AppData, container: string): string[] {
  const cal = data.settings.activeCalendarId;
  if (container.startsWith('day:')) {
    const d = container.slice(4);
    return tasksForDay(data, cal, d).map((o) => itemId(o.task.id, d));
  }
  return tasksForList(data, container.slice(5)).map((t) => itemId(t.id, null));
}

function Shell() {
  const store = useAppStore();
  const view = useApp((s) => s.data.settings.view);
  const dialog = useApp((s) => s.dialog);
  const searchOpen = useApp((s) => s.searchOpen);
  const [activeId, setActiveId] = useState<string | null>(null);
  const navTimer = useRef<{ id: string; h: ReturnType<typeof setInterval> } | null>(null);
  useTheme();
  useTicker();
  useShortcuts();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const stopNav = () => {
    if (navTimer.current) { clearInterval(navTimer.current.h); navTimer.current = null; }
  };
  const onOver = (e: DragOverEvent) => {
    const oid = e.over ? String(e.over.id) : '';
    if (oid.startsWith('nav:')) {
      if (navTimer.current?.id === oid) return;
      stopNav();
      const dir = oid === 'nav:prev' ? -1 : 1;
      const h = setInterval(() => store.getState().shift(dir), 900);
      navTimer.current = { id: oid, h };
    } else stopNav();
  };
  const onStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onEnd = (e: DragEndEvent) => {
    stopNav();
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const oid = String(over.id);
    if (oid.startsWith('nav:')) return;
    const a = active.data.current as { container: string; taskId: string; date: string | null; recurring: boolean };
    const st = store.getState();
    let container: string;
    let index: number | undefined;
    if (oid.startsWith('day:') || oid.startsWith('list:')) {
      container = oid;
    } else {
      container = (over.data.current as { container: string }).container;
      const ids = containerIds(st.data, container);
      const i = ids.indexOf(oid);
      if (i >= 0) {
        index = i;
        if (container !== a.container) {
          const tr = active.rect.current.translated;
          if (tr && tr.top + tr.height / 2 > over.rect.top + over.rect.height / 2) index = i + 1;
        }
      }
    }
    if (container === a.container && a.recurring) return;
    if (container === a.container && index === undefined) return;
    const target = container.startsWith('day:') ? { date: container.slice(4) } : { listId: container.slice(5) };
    st.mutate((d) => moveTask(d, a.taskId, target, index, a.recurring ? (a.date ?? undefined) : undefined));
  };

  const overlay = useApp((s) => {
    if (!activeId) return null;
    const [, tid, date] = activeId.split(':');
    const t = s.data.tasks.find((x) => x.id === tid);
    if (!t) return null;
    return { t, date: date || null };
  });

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onStart} onDragOver={onOver} onDragEnd={onEnd} onDragCancel={() => { stopNav(); setActiveId(null); }}>
      <div className="app">
        <Header />
        {searchOpen && <SearchPanel />}
        <PrintTitle />
        <main className={`main view-${view}`}>
          {view === 'week' && <WeekView />}
          {view === 'month' && <MonthView />}
          {view === 'day' && <DayView />}
        </main>
      </div>
      <DragOverlay>
        {overlay ? (
          <ul className="tasks drag-overlay"><li className="task" data-color={overlay.t.color}>
            <TaskBody task={overlay.t} date={overlay.date} done={overlay.t.recurrence ? !!overlay.date && overlay.t.completedDates.includes(overlay.date) : overlay.t.done} recurring={!!overlay.t.recurrence} />
          </li></ul>
        ) : null}
      </DragOverlay>
      {dialog?.kind === 'editor' && <Editor key={dialog.id} id={dialog.id} occDate={dialog.date} />}
      {dialog?.kind === 'settings' && <SettingsDialog />}
      {dialog?.kind === 'stats' && <StatsDialog />}
      {dialog?.kind === 'help' && <HelpDialog />}
      <ShareConfirm />
      <StickerPicker />
      <FocusTimer />
      <Toasts />
    </DndContext>
  );
}

function PrintTitle() {
  const anchor = useApp((s) => s.anchor);
  const name = useApp((s) => s.data.calendars.find((c) => c.id === s.data.settings.activeCalendarId)?.name ?? '');
  return <div className="print-title">Дельник · {name} · {weekRangeLabel(startOfWeek(anchor))}</div>;
}

export function App() {
  const [store] = useState<AppStore>(() => createAppStore());
  return (
    <StoreContext.Provider value={store}>
      <Shell />
    </StoreContext.Provider>
  );
}
