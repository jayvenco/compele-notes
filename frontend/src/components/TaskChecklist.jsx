import { useState } from 'react';
import { taskProgress } from '../lib/utils.jsx';

export default function TaskChecklist({ tasks, onChange }) {
  const [draft, setDraft] = useState('');
  const progress = taskProgress(tasks);

  function addItem() {
    const text = draft.trim();
    if (!text) return;
    onChange([...tasks, { id: crypto.randomUUID(), text, done: false }]);
    setDraft('');
  }

  function toggleItem(id) {
    onChange(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function updateText(id, text) {
    onChange(tasks.map((t) => (t.id === id ? { ...t, text } : t)));
  }

  function removeItem(id) {
    onChange(tasks.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-2">
      {tasks.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500" style={{ width: `${progress.pct}%` }} />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
            {progress.done}/{progress.total}
          </span>
        </div>
      )}

      <ul className="space-y-1">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => toggleItem(t.id)}
              className="w-4 h-4 accent-green-600"
            />
            <input
              type="text"
              value={t.text}
              onChange={(e) => updateText(t.id, e.target.value)}
              className={`flex-1 bg-transparent outline-none text-sm ${
                t.done ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'
              }`}
            />
            <button
              type="button"
              onClick={() => removeItem(t.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="Add a task and press Enter"
          className="flex-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-gray-900 dark:text-gray-100"
        />
        <button
          type="button"
          onClick={addItem}
          className="text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          Add
        </button>
      </div>
    </div>
  );
}
