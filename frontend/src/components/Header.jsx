export default function Header({ user, search, onSearchChange, onNewNote, onToggleSidebar, onSwitchUser, theme, onToggleTheme }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={onToggleSidebar}
        className="lg:hidden text-gray-600 dark:text-gray-200 px-1"
        title="Toggle sidebar"
      >
        ☰
      </button>
      <span className="font-semibold text-lg text-gray-900 dark:text-gray-100 shrink-0">📝 Notes</span>

      <div className="flex-1 max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search notes, tags, categories…"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        onClick={onNewNote}
        className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 shrink-0"
      >
        + New Note
      </button>

      <button
        onClick={onToggleTheme}
        title="Toggle dark mode"
        className="text-gray-600 dark:text-gray-200 px-1 shrink-0"
      >
        {theme === 'dark' ? '🌙' : '☀️'}
      </button>

      <button
        onClick={onSwitchUser}
        title="Switch user"
        className="text-sm text-gray-600 dark:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
      >
        👤 {user.name}
      </button>
    </header>
  );
}
