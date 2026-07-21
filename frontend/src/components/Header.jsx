import { useEffect, useRef, useState } from 'react';

export default function Header({ search, onSearchChange, onToggleSidebar }) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    function onKey(e) {
      const isMac = navigator.userAgent.includes('Mac');
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center gap-4 px-5 border-b shrink-0"
      style={{
        background: 'color-mix(in srgb, var(--an-bg) 70%, transparent)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'var(--an-border)',
      }}
    >
      {/* Mobile sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="lg:hidden p-2 rounded-xl transition-colors shrink-0"
        style={{ color: 'var(--an-muted)' }}
        title="Zijbalk"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Search — centered */}
      <div className="flex-1 max-w-2xl mx-auto">
        <div
          className="flex items-center gap-3 h-10 rounded-xl border px-4 transition-all duration-200"
          style={{
            background: 'var(--an-card)',
            borderColor: focused ? 'var(--an-accent)' : 'var(--an-border)',
            boxShadow: focused ? '0 0 0 3px color-mix(in srgb, var(--an-accent) 18%, transparent)' : 'none',
          }}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            style={{ color: 'var(--an-muted)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.15 10.15z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Zoek notities…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--an-fg)' }}
          />
          {search ? (
            <button
              onClick={() => onSearchChange('')}
              className="text-sm shrink-0 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--an-muted)' }}
            >
              ✕
            </button>
          ) : (
            <span
              className="hidden sm:inline-flex items-center text-xs shrink-0 px-1.5 py-0.5 rounded-md border font-mono"
              style={{ color: 'var(--an-muted)', borderColor: 'var(--an-border)', background: 'var(--an-sidebar-acc)' }}
            >
              ⌘K
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
