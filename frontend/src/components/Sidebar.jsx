import { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { COLORS, colorClasses } from '../lib/utils.jsx';

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2 px-1">{title}</h3>
      {children}
    </div>
  );
}

export default function Sidebar({
  open,
  categories,
  tags,
  filters,
  onFilterChange,
  onCategoriesChanged,
  onTagsChanged,
}) {
  const [newCategory, setNewCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const importRef = useRef(null);

  async function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    await api.createCategory(name);
    setNewCategory('');
    onCategoriesChanged();
  }

  async function renameCategory(cat) {
    const name = window.prompt('Rename category', cat.name);
    if (!name || name.trim() === cat.name) return;
    await api.renameCategory(cat.id, name.trim());
    onCategoriesChanged();
  }

  async function deleteCategory(cat) {
    if (!window.confirm(`Delete category "${cat.name}"? Notes will become uncategorized.`)) return;
    await api.deleteCategory(cat.id);
    if (filters.category === cat.id) onFilterChange({ category: '' });
    onCategoriesChanged();
  }

  async function renameTag(tag) {
    const name = window.prompt('Rename tag', tag.name);
    if (!name || name.trim() === tag.name) return;
    await api.renameTag(tag.id, name.trim());
    onTagsChanged();
  }

  async function deleteTag(tag) {
    if (!window.confirm(`Delete tag "#${tag.name}"?`)) return;
    await api.deleteTag(tag.id);
    if (filters.tag === tag.id) onFilterChange({ tag: '' });
    onTagsChanged();
  }

  async function handleExport() {
    setBusy(true);
    try {
      const blob = await api.exportBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notes-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!window.confirm('Restoring will replace all current data. Continue?')) return;
    setBusy(true);
    try {
      await api.importBackup(file);
      window.alert('Restore complete. The app will reload.');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      window.alert(`Restore failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      className={`${
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } fixed lg:sticky top-[57px] lg:top-0 left-0 z-20 h-[calc(100vh-57px)] lg:h-screen w-64 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto transition-transform`}
    >
      <Section title="Filters">
        <select
          value={filters.type || ''}
          onChange={(e) => onFilterChange({ type: e.target.value })}
          className="w-full mb-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5"
        >
          <option value="">All types</option>
          <option value="note">Notes</option>
          <option value="task">Tasks</option>
        </select>

        <select
          value={filters.completed || ''}
          onChange={(e) => onFilterChange({ completed: e.target.value })}
          className="w-full mb-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5"
        >
          <option value="">Any task status</option>
          <option value="false">Incomplete tasks</option>
          <option value="true">Completed tasks</option>
        </select>

        <div className="flex flex-wrap gap-1 px-0.5">
          <button
            onClick={() => onFilterChange({ color: '' })}
            className={`w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs ${
              !filters.color ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            ⨯
          </button>
          {COLORS.map((c) => (
            <button
              key={c}
              title={c}
              onClick={() => onFilterChange({ color: filters.color === c ? '' : c })}
              className={`w-6 h-6 rounded-full ${colorClasses(c)} ${
                filters.color === c ? 'ring-2 ring-offset-1 ring-blue-500' : ''
              }`}
            />
          ))}
        </div>
      </Section>

      <Section title="Categories">
        <ul className="space-y-0.5 mb-2">
          <li>
            <button
              onClick={() => onFilterChange({ category: '' })}
              className={`w-full text-left text-sm px-2 py-1 rounded ${
                !filters.category ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              All categories
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id} className="group flex items-center">
              <button
                onClick={() => onFilterChange({ category: filters.category === c.id ? '' : c.id })}
                className={`flex-1 text-left text-sm px-2 py-1 rounded truncate ${
                  filters.category === c.id ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                }`}
              >
                {c.name}
              </button>
              <button onClick={() => renameCategory(c)} className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-blue-500 px-1">
                ✎
              </button>
              <button onClick={() => deleteCategory(c)} className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 px-1">
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-1">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            placeholder="New category"
            className="flex-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-gray-900 dark:text-gray-100"
          />
          <button onClick={addCategory} className="text-sm px-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
            +
          </button>
        </div>
      </Section>

      <Section title="Tags">
        <ul className="space-y-0.5 max-h-40 overflow-y-auto">
          {tags.map((t) => (
            <li key={t.id} className="group flex items-center">
              <button
                onClick={() => onFilterChange({ tag: filters.tag === t.id ? '' : t.id })}
                className={`flex-1 text-left text-sm px-2 py-1 rounded truncate ${
                  filters.tag === t.id ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                }`}
              >
                #{t.name}
              </button>
              <button onClick={() => renameTag(t)} className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-blue-500 px-1">
                ✎
              </button>
              <button onClick={() => deleteTag(t)} className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 px-1">
                ✕
              </button>
            </li>
          ))}
          {tags.length === 0 && <p className="text-xs text-gray-400 px-2">No tags yet</p>}
        </ul>
      </Section>

      <Section title="Backup & Restore">
        <button
          onClick={handleExport}
          disabled={busy}
          className="w-full mb-2 text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 disabled:opacity-50"
        >
          ⬇ Export backup
        </button>
        <button
          onClick={() => importRef.current?.click()}
          disabled={busy}
          className="w-full text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 disabled:opacity-50"
        >
          ⬆ Restore from backup
        </button>
        <input ref={importRef} type="file" accept=".zip" className="hidden" onChange={handleImportFile} />
      </Section>
    </aside>
  );
}
