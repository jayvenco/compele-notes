export const COLORS = ['yellow', 'blue', 'green', 'red', 'purple', 'orange', 'pink', 'gray'];

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
