import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { colorClasses, stripHtml, taskProgress } from '../lib/utils.jsx';

export default function KanbanCard({ note, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const snippet = stripHtml(note.content).slice(0, 100);
  const progress = note.type === 'task' ? taskProgress(note.tasks) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`relative rounded-xl border border-black/5 dark:border-white/10 shadow-sm ${colorClasses(note.color)}`}
    >
      {/* Drag handle — top strip */}
      <div
        {...listeners}
        className="absolute top-0 left-0 right-0 h-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 hover:opacity-100 transition-opacity z-10"
        title="Slepen"
      >
        <span className="text-gray-400 dark:text-gray-500 text-xs tracking-widest">⠿⠿</span>
      </div>

      {/* Card body — clickable to open */}
      <button
        onClick={onOpen}
        className="w-full text-left p-3 pt-4 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-1 mb-1">
          <p className="font-medium text-sm text-gray-900 dark:text-gray-50 line-clamp-2 break-words">
            {note.title || 'Untitled'}
          </p>
          <span className="text-xs shrink-0 px-1 rounded bg-black/10 dark:bg-white/10 text-gray-600 dark:text-gray-300">
            {note.type === 'task' ? '✓' : '📝'}
          </span>
        </div>

        {snippet && (
          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-1.5">
            {snippet}
          </p>
        )}

        {progress && progress.total > 0 && (
          <div className="h-1 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-green-500" style={{ width: `${progress.pct}%` }} />
          </div>
        )}

        {note.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.slice(0, 3).map((t) => (
              <span
                key={t.id}
                className="text-xs px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-300"
              >
                #{t.name}
              </span>
            ))}
          </div>
        )}
      </button>
    </div>
  );
}
