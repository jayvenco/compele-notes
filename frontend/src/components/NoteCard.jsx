import { colorClasses, stripHtml, formatDate, taskProgress, highlightText } from '../lib/utils.jsx';

export default function NoteCard({ note, categoryName, onClick, searchTerm }) {
  const snippet = stripHtml(note.content).slice(0, 180);
  const progress = note.type === 'task' ? taskProgress(note.tasks) : null;

  return (
    <button
      onClick={onClick}
      className={`masonry-item w-full text-left rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 border border-black/5 dark:border-white/10 ${colorClasses(
        note.color
      )}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-gray-900 dark:text-gray-50 line-clamp-2 break-words">
          {highlightText(note.title || 'Untitled', searchTerm)}
        </h3>
        <span
          title={note.type === 'task' ? 'Task' : 'Note'}
          className="text-xs shrink-0 px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-gray-700 dark:text-gray-200"
        >
          {note.type === 'task' ? '✓ Task' : '📝 Note'}
        </span>
      </div>

      {snippet && (
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-4 mb-2 break-words">
          {highlightText(snippet, searchTerm)}
        </p>
      )}

      {note.type === 'task' && progress && progress.total > 0 && (
        <div className="mb-2">
          <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {progress.done}/{progress.total} done
            {note.due_date ? ` · due ${formatDate(note.due_date)}` : ''}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="flex flex-wrap gap-1 min-w-0">
          {categoryName && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-gray-700 dark:text-gray-200">
              {categoryName}
            </span>
          )}
          {note.tags?.slice(0, 3).map((t) => (
            <span
              key={t.id}
              className="text-xs px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-300"
            >
              #{highlightText(t.name, searchTerm)}
            </span>
          ))}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
          {formatDate(note.updated_at)}
        </span>
      </div>
    </button>
  );
}
