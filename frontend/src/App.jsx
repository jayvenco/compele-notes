import { useEffect, useState } from 'react';
import { api, clearCurrentUserId } from './lib/api.js';
import Login from './components/Login.jsx';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import KanbanBoard from './components/KanbanBoard.jsx';
import NoteEditorModal from './components/NoteEditorModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import PomodoroTimer from './components/PomodoroTimer.jsx';
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

function useFont() {
  const [font, setFont] = useState(() => localStorage.getItem('notes.font') || '');
  function apply(id) {
    if (id) document.documentElement.setAttribute('data-font', id);
    else document.documentElement.removeAttribute('data-font');
    localStorage.setItem('notes.font', id);
    setFont(id);
  }
  useEffect(() => { apply(font); }, []);
  return [font, apply];
}

function useColorTheme() {
  const [colorTheme, setColorTheme] = useState(() => localStorage.getItem('notes.colorTheme') || '');
  function apply(id) {
    if (id) document.documentElement.setAttribute('data-colortheme', id);
    else document.documentElement.removeAttribute('data-colortheme');
    localStorage.setItem('notes.colorTheme', id);
    setColorTheme(id);
  }
  useEffect(() => { apply(colorTheme); }, []);
  return [colorTheme, apply];
}

export default function App() {
  const [user, setUser] = useState(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const [colorTheme, setColorTheme] = useColorTheme();
  const [font, setFont] = useFont();
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const [todayCount, setTodayCount] = useState(0);

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [filters, setFilters] = useState({ category: '', tag: '', type: '', color: '', completed: '', search: '', due_today: '' });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    refreshTodayCount();
  }, [user]);

  function refreshTodayCount() {
    api.listNotes({ due_today: 'true', type: 'task', pageSize: 1 })
      .then((r) => setTodayCount(r.notes?.length === 1 ? '1+' : 0))
      .catch(() => {});
  }

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
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--an-bg)', color: 'var(--an-fg)' }}>
      {!online && <OfflineBanner />}

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        user={user}
        onSwitchUser={handleSwitchUser}
        categories={categories}
        tags={tags}
        filters={filters}
        onFilterChange={updateFilters}
        view={view}
        onViewChange={handleViewChange}
        onNewNote={() => handleNewNote()}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        onTogglePomodoro={() => setPomodoroOpen((o) => !o)}
        pomodoroActive={pomodoroOpen}
        todayCount={todayCount}
        onCategoriesChanged={refreshCategories}
        onTagsChanged={refreshTags}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <Header
          search={filters.search}
          onSearchChange={(search) => updateFilters({ search })}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        />

        <main className="flex-1 overflow-y-auto overflow-x-auto p-6">
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

      {pomodoroOpen && <PomodoroTimer onClose={() => setPomodoroOpen(false)} />}

      {settingsOpen && (
        <SettingsModal
          categories={categories}
          onCategoriesChanged={refreshCategories}
          colorTheme={colorTheme}
          onColorThemeChange={setColorTheme}
          font={font}
          onFontChange={setFont}
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
