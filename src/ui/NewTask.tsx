import { useState } from 'react';
import { useAppStore, type AddTarget } from '../store/store';

export function NewTask({ target }: { target: AddTarget }) {
  const store = useAppStore();
  const [text, setText] = useState('');
  return (
    <input
      type="text"
      className="new-task"
      aria-label="Новая задача"
      placeholder="Например: завтра в 18:00 позвонить маме"
      value={text}
      autoComplete="off"
      enterKeyHint="done"
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
          e.preventDefault();
          if (store.getState().addFromInput(text, target)) setText('');
        }
      }}
    />
  );
}
