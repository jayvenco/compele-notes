import { useEffect, useState } from 'react';
import { api, clearCurrentUserId } from './lib/api.js';
import Login from './components/Login.jsx';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import KanbanBoard from './components/KanbanBoard.jsx';
import NoteEditorModal from './components/NoteEditorModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import { useOnline } from './lib/useOnline.js';

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('notes.theme') || 'light');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('notes.theme', theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}

export default function App() {
  const [user, setUser] = useState(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [theme, toggleTheme] = useTheme();

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [filters, setFilters] = useState({ category: '', tag: '', type: '', color: '', completed: '', search: '' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState(() => localStorage.getItem('notes.view') || 'grid');
  const [editingNoteId, setEditingNoteId] = useState(undefined);
  const [newNoteColumnId, setNewNoteColumnId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const online = useOnline();

  useEffect(() => {
    const userId = localStorage.getItem('notes.userId');
    if (!userId) { setBootstrapped(true); return; }
    api.listUsers()
      .then((users) => {
        const existing = users.find((u) => u.id === userId);
        if (existing) setUser(existing);
        else clearCurrentUserId();
      })
      .finally(() => setBootstrapped(true));
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshCategories();
    refreshTags();
  }, [user]);

  function refreshCategories() { api.listCategories().then(setCategories); }
  function refreshTags() { api.listTags().then(setTags); }

  function updateFilters(patch) { setFilters((prev) => ({ ...prev, ...patch })); }

  function handleSwitchUser() { clearCurrentUserId(); setUser(null); }

  function handleViewChange(v) {
    setView(v);
    localStorage.setItem('notes.view', v);
  }

  function handleNewNote(columnId = null) {
    setNewNoteColumnId(columnId);
    setEditingNoteId(null);
  }

  function handleNoteAutosaved() { setRefreshKey((k) => k + 1); }

  function handleEditorClose() {
    setEditingNoteId(undefined);
    setNewNoteColumnId(null);
    setRefreshKey((k) => k + 1);
  }

  function handleNoteDeleted() {
    setEditingNoteId(undefined);
    setNewNoteColumnId(null);
    setRefreshKey((k) => k + 1);
  }

  if (!bootstrapped) return null;
  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${online ? '' : 'pt-9'}`}>
      {!online && <OfflineBanner />}
      <Header
        user={user}
        search={filters.search}
        onSearchChange={(search) => updateFilters({ search })}
        onNewNote={() => handleNewNote()}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        onSwitchUser={handleSwitchUser}
        theme={theme}
        onToggleTheme={toggleTheme}
        view={view}
        onViewChange={handleViewChange}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex">
        <Sidebar
          open={sidebarOpen}
          categories={categories}
          tags={tags}
          filters={filters}
          onFilterChange={updateFilters}
          onCategoriesChanged={refreshCategories}
          onTagsChanged={refreshTags}
        />

        <main className="flex-1 p-4 min-w-0 overflow-x-auto">
          {view === 'grid' ? (
            <Dashboard
              filters={filters}
              categories={categories}
              refreshKey={refreshKey}
              onOpenNote={(id) => setEditingNoteId(id)}
            />
          ) : (
            <KanbanBoard
              refreshKey={refreshKey}
              onOpenNote={(id) => setEditingNoteId(id)}
              onNewNote={(columnId) => handleNewNote(columnId)}
            />
          )}
        </main>
      </div>

      <button
        onClick={() => handleNewNote()}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-2xl shadow-lg flex items-center justify-center z-40"
        title="Nieuwe notitie"
      >
        +
      </button>

      {settingsOpen && (
        <SettingsModal
          categories={categories}
          onCategoriesChanged={refreshCategories}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {editingNoteId !== undefined && (
        <NoteEditorModal
          noteId={editingNoteId}
          initialColumnId={newNoteColumnId}
          categories={categories}
          tags={tags}
          onClose={handleEditorClose}
          onAutosaved={handleNoteAutosaved}
          onDeleted={handleNoteDeleted}
          onTagsChanged={refreshTags}
        />
      )}
    </div>
  );
}
