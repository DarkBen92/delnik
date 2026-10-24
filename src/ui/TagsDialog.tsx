import { useEffect, useState } from 'react';
import { addTag, deleteTag, findTag, updateTag } from '../domain/tags';
import type { Tag, TaskColor } from '../domain/types';
import { useApp, useAppStore } from '../store/store';
import { Dialog } from './Dialog';
import { IconClose, IconPlus } from './icons';
import { Swatches, TagDot } from './Swatches';
import { MARKERS, plural } from './util';

function TagItem({ tag, used }: { tag: Tag; used: number }) {
  const store = useAppStore();
  const [name, setName] = useState(tag.name);
  const [palette, setPalette] = useState(false);
  useEffect(() => setName(tag.name), [tag.name]);

  const rename = () => {
    const st = store.getState();
    const t = name.trim();
    const taken = findTag(st.data, t);
    if (taken && taken.id !== tag.id) st.toast(`Тэг «${taken.name}» уже есть`, 'error');
    if (!t || t === tag.name || (taken && taken.id !== tag.id)) { setName(tag.name); return; }
    st.mutate((d) => updateTag(d, tag.id, { name: t }));
  };

  return (
    <li className="tag-item">
      <div className="tag-item-row">
        <button
          type="button"
          className="tag-color-btn"
          aria-label={`Цвет тэга «${tag.name}»`}
          aria-expanded={palette}
          title="Сменить цвет"
          onClick={() => setPalette((v) => !v)}
        >
          <TagDot color={tag.color} className="big" />
        </button>
        <input
          className="cal-name-input"
          aria-label={`Название тэга «${tag.name}»`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={rename}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
        <span className="tag-count">{used ? `${used} ${plural(used, ['задача', 'задачи', 'задач'])}` : 'не используется'}</span>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Удалить тэг «${tag.name}»`}
          title="Удалить тэг (задачи останутся)"
          onClick={() => store.getState().mutate((d) => deleteTag(d, tag.id))}
        >
          <IconClose size={14} />
        </button>
      </div>
      {palette && (
        <div className="ed-colors tag-palette" role="radiogroup" aria-label={`Цвет тэга «${tag.name}»`}>
          <Swatches
            value={tag.color}
            onPick={(color) => {
              store.getState().mutate((d) => updateTag(d, tag.id, { color }));
              setPalette(false);
            }}
          />
        </div>
      )}
    </li>
  );
}

/** Окно управления тэгами: список с цветом и счётчиком задач, внизу — создание нового. */
export function TagsDialog() {
  const store = useAppStore();
  const tags = useApp((s) => s.data.tags);
  const tasks = useApp((s) => s.data.tasks);
  const [name, setName] = useState('');
  const [color, setColor] = useState<TaskColor>('none');
  const st = () => store.getState();
  const usage = new Map<string, number>();
  for (const t of tasks) if (t.tagId) usage.set(t.tagId, (usage.get(t.tagId) ?? 0) + 1);
  const m = MARKERS[color];

  return (
    <Dialog label="Тэги" onClose={() => st().closeDialog()}>
      <p className="muted tags-hint">Тэг подписывает задачу и красит её, если у задачи нет своего цвета.</p>

      {tags.length === 0
        ? <p className="tags-empty">Тэгов пока нет. Создайте первый — например, «Спорт» с жёлтым цветом.</p>
        : (
          <ul className="tag-items" aria-label="Список тэгов">
            {tags.map((t) => <TagItem key={t.id} tag={t} used={usage.get(t.id) ?? 0} />)}
          </ul>
        )}

      <form
        className="tag-new"
        onSubmit={(e) => {
          e.preventDefault();
          const r = addTag(st().data, name, color);
          if (!r.tag) return;
          st().replaceData(r.data);
          setName('');
          setColor('none');
        }}
      >
        <div className="tag-new-head">Новый тэг</div>
        <div className="tag-new-row">
          <input
            className="tag-input"
            aria-label="Название нового тэга"
            placeholder="Например, Спорт"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <span className="tag-preview" aria-hidden="true">
            <span className="pill" style={color === 'none' ? undefined : { background: m.bg, color: m.ink }}>
              {name.trim() || 'Задача'}
            </span>
          </span>
        </div>
        <div className="ed-colors" role="radiogroup" aria-label="Цвет нового тэга">
          <Swatches value={color} onPick={setColor} />
        </div>
        <button type="submit" className="pill-btn dark tag-create" disabled={!name.trim()}>
          <IconPlus size={16} /> Создать тэг
        </button>
      </form>
    </Dialog>
  );
}
