import { useRef, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, MeasuringStrategy, PointerSensor, TouchSensor, closestCenter, pointerWithin,
  useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import '@fontsource-variable/golos-text';
import { startOfWeek, weekRangeLabel } from '../domain/dates';
import { moveTask, tasksForDay, tasksForList } from '../domain/tasks';
import type { AppData } from '../domain/types';
import { StoreContext, createAppStore, useApp, useAppStore, type AppStore } from '../store/store';
import { Editor } from './Editor';
import { FocusTimer } from './FocusTimer';
import { Header } from './Header';
import { Menu } from './Menu';
import { MonthPanel } from './MonthPanel';
import { HelpDialog, SearchPanel, ShareConfirm, StatsDialog, StickerPicker, Toasts } from './Panels';
import { SomedayLists } from './Someday';
import { TaskLine, WeekGrid, itemId } from './Week';
import { useShortcuts, useTheme, useTicker } from './hooks';
import './styles.css';

/** Стрелки недели «перехватывают» задачу, иначе — ближайшая строка или колонка. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const navHit = hits.find((h) => String(h.id).startsWith('nav:'));
  if (navHit) return [navHit];
  return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => !String(c.id).startsWith('nav:')) });
};

function containerIds(data: AppData, container: string): string[] {
  const cal = data.settings.activeCalendarId;
  if (container.startsWith('day:')) {
    const d = container.slice(4);
    return tasksForDay(data, cal, d).map((o) => itemId(o.task.id, d));
  }
  return tasksForList(data, container.slice(5)).map((t) => itemId(t.id, null));
}

interface DragData { container: string; taskId: string; date: string | null; recurring: boolean }

function Shell() {
  const store = useAppStore();
  const dialog = useApp((s) => s.dialog);
  const searchOpen = useApp((s) => s.searchOpen);
  const [active, setActive] = useState<DragData | null>(null);
  const navTimer = useRef<{ id: string; h: ReturnType<typeof setInterval> } | null>(null);
  useTheme();
  useTicker();
  useShortcuts();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const stopNav = () => {
    if (navTimer.current) { clearInterval(navTimer.current.h); navTimer.current = null; }
  };
  const onOver = (e: DragOverEvent) => {
    const oid = e.over ? String(e.over.id) : '';
    if (!oid.startsWith('nav:')) { stopNav(); return; }
    if (navTimer.current?.id === oid) return;
    stopNav();
    const dir = oid === 'nav:prev' ? -1 : 1;
    navTimer.current = { id: oid, h: setInterval(() => store.getState().shift(dir), 700) };
  };
  // Данные берём из начала перетаскивания: при перелистывании недели исходная строка размонтируется.
  const dragRef = useRef<DragData | null>(null);
  const onStart = (e: DragStartEvent) => {
    dragRef.current = e.active.data.current as DragData;
    setActive(dragRef.current);
  };
  const onEnd = (e: DragEndEvent) => {
    stopNav();
    setActive(null);
    const { active: a0, over } = e;
    if (!over) { dragRef.current = null; return; }
    const oid = String(over.id);
    if (oid.startsWith('nav:')) { dragRef.current = null; return; }
    const a = dragRef.current;
    dragRef.current = null;
    if (!a) return;
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
          const tr = a0.rect.current.translated;
          if (tr && tr.top + tr.height / 2 > over.rect.top + over.rect.height / 2) index = i + 1;
        }
      }
    }
    // Повторяющуюся задачу внутри её же дня не двигаем: иначе сдвинется вся серия.
    if (container === a.container && a.recurring) return;
    if (container === a.container && index === undefined) return;
    const target = container.startsWith('day:') ? { date: container.slice(4) } : { listId: container.slice(5) };
    st.mutate((d) => moveTask(d, a.taskId, target, index, a.recurring ? (a.date ?? undefined) : undefined));
  };

  // Селектор возвращает саму задачу (стабильная ссылка): новый объект на каждый вызов зацикливает рендер.
  const activeTask = useApp((s) => (active ? s.data.tasks.find((t) => t.id === active.taskId) : undefined));
  const activeDone = activeTask
    ? (activeTask.recurrence ? !!active?.date && activeTask.completedDates.includes(active.date) : activeTask.done)
    : false;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      // Неделя может перелистнуться во время перетаскивания — новые дни нужно измерять заново.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onStart}
      onDragOver={onOver}
      onDragEnd={onEnd}
      onDragCancel={() => { stopNav(); setActive(null); dragRef.current = null; }}
    >
      <div className="app">
        <Header />
        <PrintTitle />
        <main>
          <WeekGrid />
          <SomedayLists />
        </main>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask && active ? (
          <ul className="rows overlay-row">
            <li className={`row task is-lifted${activeDone ? ' is-done' : ''}`}>
              <TaskLine task={activeTask} date={active.date} done={activeDone} recurring={active.recurring} />
            </li>
          </ul>
        ) : null}
      </DragOverlay>
      {searchOpen && <SearchPanel />}
      {dialog?.kind === 'editor' && <Editor key={`${dialog.id}:${dialog.date ?? ''}`} id={dialog.id} occDate={dialog.date} />}
      {dialog?.kind === 'menu' && <Menu />}
      {dialog?.kind === 'month' && <MonthPanel />}
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
