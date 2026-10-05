import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useState } from 'react';
import { addList, deleteList, renameList, tasksForList } from '../domain/tasks';
import type { SomedayList } from '../domain/types';
import { useApp, useAppStore } from '../store/store';
import { itemId, SortableTask } from './TaskItem';
import { NewTask } from './NewTask';

function ListColumn({ list }: { list: SomedayList }) {
  const store = useAppStore();
  const data = useApp((s) => s.data);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.title);
  const [confirm, setConfirm] = useState(false);
  const container = `list:${list.id}`;
  const { setNodeRef, isOver } = useDroppable({ id: container, data: { container } });
  const tasks = tasksForList(data, list.id);
  const shown = data.settings.showCompleted ? tasks : tasks.filter((t) => !t.done);
  const commit = () => {
    const t = name.trim();
    if (t && t !== list.title) store.getState().mutate((d) => renameList(d, list.id, t));
    else setName(list.title);
    setEditing(false);
  };
  return (
    <section className="list" aria-label={list.title}>
      <header className="list-head">
        {editing ? (
          <input
            className="list-rename"
            aria-label={`Название списка «${list.title}»`}
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { e.stopPropagation(); setName(list.title); setEditing(false); } }}
          />
        ) : (
          <span className="list-title">{list.title}</span>
        )}
        <span className="list-actions no-print">
          <button type="button" className="icon-btn small" aria-label={`Переименовать список «${list.title}»`} onClick={() => { setName(list.title); setEditing(true); }}>✎</button>
          {confirm ? (
            <>
              <button type="button" className="btn danger small" onClick={() => store.getState().mutate((d) => deleteList(d, list.id))}>Удалить со всеми задачами</button>
              <button type="button" className="btn small" onClick={() => setConfirm(false)}>Нет</button>
            </>
          ) : (
            <button type="button" className="icon-btn small" aria-label={`Удалить список «${list.title}»`} onClick={() => setConfirm(true)}>×</button>
          )}
        </span>
      </header>
      <div ref={setNodeRef} className={`day-body${isOver ? ' is-over' : ''}`}>
        <SortableContext items={shown.map((t) => itemId(t.id, null))} strategy={verticalListSortingStrategy}>
          <ul className="tasks">
            {shown.map((t) => (
              <SortableTask key={t.id} task={t} date={null} done={t.done} recurring={false} container={container} />
            ))}
          </ul>
        </SortableContext>
        {shown.length === 0 && <p className="empty-hint">Сюда — всё, что без срока.</p>}
        <NewTask target={{ listId: list.id }} />
      </div>
    </section>
  );
}

export function SomedayRow() {
  const store = useAppStore();
  const data = useApp((s) => s.data);
  const cal = data.settings.activeCalendarId;
  const lists = data.lists.filter((l) => l.calendarId === cal).sort((a, b) => a.order - b.order);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const submit = () => {
    const t = name.trim();
    if (t) store.getState().mutate((d) => addList(d, cal, t).data);
    setName('');
    setAdding(false);
  };
  return (
    <div className="someday">
      {lists.map((l) => <ListColumn key={l.id} list={l} />)}
      <div className="list-add no-print">
        {adding ? (
          <input
            className="list-rename"
            aria-label="Название нового списка"
            placeholder="Название списка"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={submit}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { e.stopPropagation(); setName(''); setAdding(false); } }}
          />
        ) : (
          <button type="button" className="btn ghost" onClick={() => setAdding(true)}>+ Список</button>
        )}
      </div>
    </div>
  );
}
