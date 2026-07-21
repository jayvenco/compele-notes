import { useState } from 'react';
import { COLORS, colorClasses, stripHtml, formatDate, taskProgress, highlightText } from '../lib/utils.jsx';

function ColorPicker({ current, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="w-6 h-6 rounded-full flex items-center justify-center bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-xs"
        title="Kleur wijzigen"
      >
        🎨
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div
            className="absolute right-0 top-8 z-20 flex gap-1.5 flex-wrap w-28 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {COLORS.map((c) => (
              <button
                key={c}
                title={c}
                onClick={(e) => { e.stopPropagation(); onChange(c); setOpen(false); }}
                className={`w-7 h-7 rounded-full ${colorClasses(c)} border-2 ${
                  current === c ? 'border-blue-500 scale-110' : 'border-transparent hover:scale-105'
                } transition-transform`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function NoteCard({ note, categoryName, onClick, onColorChange, searchTerm }) {
  const snippet = stripHtml(note.content).slice(0, 180);
  const progress = note.type === 'task' ? taskProgress(note.tasks) : null;

  return (
    <div className={`masonry-item group relative w-full rounded-xl shadow-sm hover:shadow-md transition-shadow border border-black/5 dark:border-white/10 ${colorClasses(note.color)}`}>
      <button onClick={onClick} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 break-words">
            {highlightText(note.title || 'Untitled', searchTerm)}
          </h3>
          <span
            title={note.type === 'task' ? 'Task' : 'Note'}
            className="text-xs shrink-0 px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/20 text-gray-700 dark:text-white"
          >
            {note.type === 'task' ? '✓ Task' : '📝 Note'}
          </span>
        </div>

        {snippet && (
          <p className="text-sm text-gray-700 dark:text-gray-100 line-clamp-4 mb-2 break-words">
            {highlightText(snippet, searchTerm)}
          </p>
        )}

        {note.type === 'task' && progress && progress.total > 0 && (
          <div className="mb-2">
            <div className="h-1.5 w-full bg-black/10 dark:bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${progress.pct}%` }} />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-200 mt-1">
              {progress.done}/{progress.total} done
              {note.due_date ? ` · due ${formatDate(note.due_date)}` : ''}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex flex-wrap gap-1 min-w-0">
            {categoryName && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/20 text-gray-700 dark:text-white">
                {categoryName}
              </span>
            )}
            {note.tags?.slice(0, 3).map((t) => (
              <span
                key={t.id}
                className="text-xs px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-100"
              >
                #{highlightText(t.name, searchTerm)}
              </span>
            ))}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-200 shrink-0">
            {formatDate(note.updated_at)}
          </span>
        </div>
      </button>

      {/* Color picker — verschijnt bij hover */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ColorPicker current={note.color} onChange={(c) => onColorChange(note.id, c)} />
      </div>
    </div>
  );
}
