import { useState } from 'react';
import { api } from '../lib/api.js';

const THEMES = [
  { id: '', label: 'Standaard' },
  { id: 'black-orange', label: 'Zwart-Oranje', accent: '#f77f00', bg: '#000' },
  { id: 'neon', label: 'Neon', accent: '#00ffcc', bg: '#050510' },
  { id: 'youtube', label: 'YouTube', accent: '#ff0000', bg: '#f9f9f9' },
  { id: 'github', label: 'GitHub', accent: '#238636', bg: '#0d1117' },
  { id: 'blue-terminal', label: 'Blauw Terminal', accent: '#00b4d8', bg: '#000814' },
  { id: 'black-green', label: 'Zwart-Groen', accent: '#00ff41', bg: '#000' },
  { id: 'earth', label: 'Aarde', accent: '#c17d3c', bg: '#2c1a0e' },
];

export default function SettingsModal({ categories, onCategoriesChanged, colorTheme, onColorThemeChange, onClose }) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [busy, setBusy] = useState(false);

  async function addCategory() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await api.createCategory(name);
      setNewName('');
      onCategoriesChanged();
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id) {
    const name = editingName.trim();
    if (!name) { setEditingId(null); return; }
    await api.renameCategory(id, name);
    setEditingId(null);
    onCategoriesChanged();
  }

  async function deleteCategory(id, name) {
    if (!window.confirm(`Categorie "${name}" verwijderen? Notities worden ongegroepeerd.`)) return;
    await api.deleteCategory(id);
    onCategoriesChanged();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Instellingen</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl px-1"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Section label */}
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
            Categorieën
          </p>

          {/* Category list */}
          <ul className="space-y-1 mb-4 max-h-64 overflow-y-auto">
            {categories.length === 0 && (
              <li className="text-sm text-gray-400 py-1">Nog geen categorieën.</li>
            )}
            {categories.map((c) => (
              <li
                key={c.id}
                className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                {editingId === c.id ? (
                  <input
                    autoFocus
                    className="flex-1 text-sm bg-transparent border-b border-blue-500 outline-none text-gray-900 dark:text-gray-100"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(c.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onBlur={() => saveEdit(c.id)}
                  />
                ) : (
                  <span className="flex-1 text-sm text-gray-800 dark:text-gray-100">{c.name}</span>
                )}
                <button
                  onClick={() => { setEditingId(c.id); setEditingName(c.name); }}
                  className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-blue-500 px-1"
                  title="Hernoemen"
                >
                  ✎
                </button>
                <button
                  onClick={() => deleteCategory(c.id, c.name)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 px-1"
                  title="Verwijderen"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          {/* Theme picker */}
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mt-5 mb-3">Kleurthema</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => onColorThemeChange(t.id)}
                title={t.label}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                  colorTheme === t.id ? 'border-blue-500' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span
                  className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center"
                  style={{ background: t.bg || '#f9fafb' }}
                >
                  {t.accent && <span className="w-3 h-3 rounded-full" style={{ background: t.accent }} />}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-300 text-center leading-tight">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Add new category */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              placeholder="Nieuwe categorie…"
              className="flex-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addCategory}
              disabled={busy || !newName.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-40"
            >
              Toevoegen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
