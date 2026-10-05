import { useEffect, useState } from 'react';
import { addList, deleteList, renameList, tasksForList } from '../domain/tasks';
import type { SomedayList } from '../domain/types';
import { useApp, useAppStore } from '../store/store';
import { LinedBody } from './Week';

function ListTitle({ list }: { list: SomedayList }) {
  const store = useAppStore();
  const [value, setValue] = useState(list.title);
  useEffect(() => setValue(list.title), [list.title]);
  const commit = () => {
    const t = value.trim();
    if (t && t !== list.title) store.getState().mutate((d) => renameList(d, list.id, t));
    else setValue(list.title);
  };
  return (
    <input
      className="list-title"
      aria-label="Название списка"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') { setValue(list.title); e.currentTarget.blur(); }
      }}
    />
  );
}

function ListColumn({ list }: { list: SomedayList }) {
  const store = useAppStore();
  const data = useApp((s) => s.data);
  const showCompleted = data.settings.showCompleted;
  const tasks = tasksForList(data, list.id).filter((t) => showCompleted || !t.done);
  const remove = () => {
    const count = tasksForList(store.getState().data, list.id).length;
    if (count > 0 && typeof window.confirm === 'function'
      && !window.confirm(`Удалить список «${list.title}» вместе с задачами (${count})?`)) return;
    store.getState().mutate((d) => deleteList(d, list.id));
  };
  return (
    <section className="list" aria-label={list.title}>
      <header className="list-head">
        <ListTitle list={list} />
        <button type="button" className="list-del" aria-label={`Удалить список «${list.title}»`} title="Удалить список" onClick={remove}>×</button>
      </header>
      <LinedBody
        container={`list:${list.id}`}
        target={{ listId: list.id }}
        rows={tasks.map((t) => ({ task: t, date: null, done: t.done, recurring: false }))}
      />
    </section>
  );
}

/** Колонка-заготовка: название пишется прямо в шапке, и список появляется. */
function GhostList() {
  const store = useAppStore();
  const cal = useApp((s) => s.data.settings.activeCalendarId);
  const [title, setTitle] = useState('');
  const create = () => {
    const t = title.trim();
    if (!t) return;
    store.getState().mutate((d) => addList(d, cal, t).data);
    setTitle('');
  };
  return (
    <section className="list ghost" aria-label="Новый список">
      <header className="list-head">
        <input
          className="list-title"
          aria-label="Название нового списка"
          placeholder="Новый список"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={create}
          onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
        />
      </header>
      <div className="lined ghost-body" aria-hidden="true" />
    </section>
  );
}

export function SomedayLists() {
  const all = useApp((s) => s.data.lists);
  const cal = useApp((s) => s.data.settings.activeCalendarId);
  const lists = all.filter((l) => l.calendarId === cal).sort((a, b) => a.order - b.order);
  const ghosts = Math.max(1, 3 - lists.length);
  return (
    <div className="someday">
      {lists.map((l) => <ListColumn key={l.id} list={l} />)}
      {Array.from({ length: ghosts }, (_, i) => <GhostList key={`g${i}`} />)}
    </div>
  );
}
