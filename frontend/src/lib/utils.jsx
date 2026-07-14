export const COLORS = ['yellow', 'blue', 'green', 'red', 'purple', 'orange', 'pink', 'gray'];

export const COLUMN_COLORS = {
  gray:   'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600',
  blue:   'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
  green:  'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700',
  red:    'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700',
  purple: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700',
  orange: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700',
  pink:   'bg-pink-50 dark:bg-pink-900/30 border-pink-200 dark:border-pink-700',
};

export function colorClasses(color) {
  const c = COLORS.includes(color) ? color : 'yellow';
  return `bg-note-${c}-light dark:bg-note-${c}-dark`;
}

export function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div.textContent || div.innerText || '';
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function taskProgress(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return { done: 0, total: 0, pct: 0 };
  const done = tasks.filter((t) => t.done).length;
  return { done, total: tasks.length, pct: Math.round((done / tasks.length) * 100) };
}

export function highlightText(text, term) {
  if (!term) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'ig');
  return text.split(re).map((part, i) =>
    re.test(part) && part.toLowerCase() === term.toLowerCase() ? (
      <mark key={i} className="search-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
