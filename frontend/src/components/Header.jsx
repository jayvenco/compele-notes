export default function Header({ user, search, onSearchChange, onNewNote, onToggleSidebar, onSwitchUser, theme, onToggleTheme, view, onViewChange, onOpenSettings }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={onToggleSidebar}
        className="lg:hidden text-gray-600 dark:text-gray-200 px-1"
        title="Toggle sidebar"
      >
        ☰
      </button>
      <img src="/logo.png" alt="Compele Notes" className="h-8 w-8 rounded-lg shrink-0" />
      <span className="font-semibold text-lg text-gray-900 dark:text-gray-100 shrink-0 hidden sm:block">Compele Notes</span>

      <div className="flex-1 max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Zoek notities, tags, categorieën…"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* View toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 shrink-0">
        <button
          onClick={() => onViewChange('grid')}
          title="Grid-weergave"
          className={`px-2.5 py-1.5 text-sm ${view === 'grid' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
        >
          ⊞
        </button>
        <button
          onClick={() => onViewChange('kanban')}
          title="Kanban-weergave"
          className={`px-2.5 py-1.5 text-sm ${view === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
        >
          ⬛⬛
        </button>
      </div>

      <button
        onClick={onNewNote}
        className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 shrink-0"
      >
        + Nieuwe notitie
      </button>

      <button
        onClick={onOpenSettings}
        title="Instellingen"
        className="text-gray-600 dark:text-gray-200 px-1 shrink-0 hover:text-gray-900 dark:hover:text-white"
      >
        ⚙
      </button>

      <button
        onClick={onToggleTheme}
        title="Donkere modus"
        className="text-gray-600 dark:text-gray-200 px-1 shrink-0"
      >
        {theme === 'dark' ? '🌙' : '☀️'}
      </button>

      <button
        onClick={onSwitchUser}
        title="Wissel gebruiker"
        className="text-sm text-gray-600 dark:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
      >
        👤 {user.name}
      </button>
    </header>
  );
}
