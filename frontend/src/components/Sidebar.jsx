import { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { COLORS, colorClasses } from '../lib/utils.jsx';
import ApiKeyManager from './ApiKeyManager.jsx';

function NavItem({ icon, label, active, onClick, collapsed, badge }) {
  const [hovered, setHovered] = useState(false);
  const isHighlighted = active || hovered;
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200"
      style={{
        gap: collapsed ? 0 : '0.75rem',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '0.6rem' : '0.6rem 0.75rem',
        background: active ? 'var(--an-accent)' : hovered ? 'var(--an-sidebar-acc)' : 'transparent',
        color: active ? '#fff' : 'var(--an-muted)',
      }}
    >
      <span className="text-base shrink-0 leading-none">{icon}</span>
      {!collapsed && (
        <span className="flex-1 text-left" style={{ color: active ? '#fff' : 'var(--an-fg)' }}>
          {label}
        </span>
      )}
      {!collapsed && badge > 0 && (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: active ? 'rgba(255,255,255,0.25)' : 'var(--an-accent)', color: '#fff' }}>
          {badge}
        </span>
      )}
    </button>
  );
}

export default function Sidebar({
  collapsed, onToggle,
  user, onSwitchUser,
  categories, tags, filters, onFilterChange,
  view, onViewChange, onNewNote,
  theme, onToggleTheme,
  onOpenSettings, onTogglePomodoro, pomodoroActive, todayCount,
  onCategoriesChanged, onTagsChanged,
}) {
  const [showBackup, setShowBackup] = useState(false);
  const [busy, setBusy] = useState(false);
  const importRef = useRef(null);

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
    } finally { setBusy(false); }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!window.confirm('Herstellen vervangt alle huidige data. Doorgaan?')) return;
    setBusy(true);
    try {
      await api.importBackup(file);
      window.alert('Herstel voltooid. De app herlaadt.');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      window.alert(`Herstel mislukt: ${err.message}`);
    } finally { setBusy(false); }
  }

  async function renameTag(tag) {
    const name = window.prompt('Tag hernoemen', tag.name);
    if (!name || name.trim() === tag.name) return;
    await api.renameTag(tag.id, name.trim());
    onTagsChanged();
  }

  async function deleteTag(tag) {
    if (!window.confirm(`Tag "#${tag.name}" verwijderen?`)) return;
    await api.deleteTag(tag.id);
    if (filters.tag === tag.id) onFilterChange({ tag: '' });
    onTagsChanged();
  }

  return (
    <aside
      className="flex flex-col h-full shrink-0 overflow-hidden transition-all duration-300"
      style={{
        width: collapsed ? '4.5rem' : '16rem',
        background: 'var(--an-sidebar)',
        borderRight: '1px solid var(--an-sidebar-bdr)',
      }}
    >
      {/* Header: logo + collapse toggle */}
      <div
        className="flex h-16 items-center shrink-0 px-3 border-b"
        style={{ borderColor: 'var(--an-sidebar-bdr)' }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
            <img src="/logo.png" alt="logo" className="h-7 w-7 rounded-lg shrink-0" />
            <span className="font-bold text-sm truncate" style={{ color: 'var(--an-fg)' }}>
              Compele Notes
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-xl transition-colors shrink-0"
          style={{
            color: 'var(--an-muted)',
            marginLeft: collapsed ? 'auto' : undefined,
            marginRight: collapsed ? 'auto' : undefined,
          }}
          title={collapsed ? 'Uitklappen' : 'Inklappen'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            {collapsed
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            }
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-0.5">

        {/* New Note button */}
        <NewNoteButton onClick={onNewNote} collapsed={collapsed} />

        {/* Main nav */}
        <div className="pt-1 pb-2 space-y-0.5">
          <NavItem icon="🗒️" label="Alle notities"
            active={view === 'grid' && !filters.due_today}
            onClick={() => { onViewChange('grid'); onFilterChange({ due_today: '' }); }}
            collapsed={collapsed}
          />
          <NavItem icon="⬛⬛" label="Kanban"
            active={view === 'kanban'}
            onClick={() => onViewChange('kanban')}
            collapsed={collapsed}
          />
          <NavItem icon="📅" label="Vandaag"
            active={!!filters.due_today}
            onClick={() => onFilterChange({ due_today: filters.due_today ? '' : 'true', type: filters.due_today ? '' : 'task' })}
            collapsed={collapsed}
            badge={todayCount}
          />
        </div>

        {!collapsed && (
          <>
            <Divider />

            {/* Type / status filters */}
            <SectionLabel>Filters</SectionLabel>
            <select
              value={filters.type || ''}
              onChange={(e) => onFilterChange({ type: e.target.value })}
              className="w-full mb-1.5 text-sm rounded-xl border px-3 py-1.5 outline-none"
              style={{ background: 'var(--an-sidebar-acc)', borderColor: 'var(--an-sidebar-bdr)', color: 'var(--an-fg)' }}
            >
              <option value="">Alle typen</option>
              <option value="note">Notities</option>
              <option value="task">Taken</option>
            </select>
            <select
              value={filters.completed || ''}
              onChange={(e) => onFilterChange({ completed: e.target.value })}
              className="w-full mb-2 text-sm rounded-xl border px-3 py-1.5 outline-none"
              style={{ background: 'var(--an-sidebar-acc)', borderColor: 'var(--an-sidebar-bdr)', color: 'var(--an-fg)' }}
            >
              <option value="">Alle statussen</option>
              <option value="false">Onafgerond</option>
              <option value="true">Afgerond</option>
            </select>

            {/* Color dots */}
            <div className="flex flex-wrap gap-1.5 px-1 pb-1">
              <button
                onClick={() => onFilterChange({ color: '' })}
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  borderColor: !filters.color ? 'var(--an-accent)' : 'var(--an-sidebar-bdr)',
                  color: 'var(--an-muted)',
                }}
              >
                ⨯
              </button>
              {COLORS.map((c) => (
                <button
                  key={c} title={c}
                  onClick={() => onFilterChange({ color: filters.color === c ? '' : c })}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${colorClasses(c)}`}
                  style={{ borderColor: filters.color === c ? 'var(--an-accent)' : 'transparent' }}
                />
              ))}
            </div>

            <Divider />

            {/* Categories */}
            <SectionLabel>Categorieën</SectionLabel>
            <FilterButton active={!filters.category} onClick={() => onFilterChange({ category: '' })}>
              Alle categorieën
            </FilterButton>
            {categories.map((c) => (
              <FilterButton key={c.id} active={filters.category === c.id}
                onClick={() => onFilterChange({ category: filters.category === c.id ? '' : c.id })}>
                {c.name}
              </FilterButton>
            ))}

            {/* Tags */}
            {tags.length > 0 && (
              <>
                <Divider />
                <SectionLabel>Tags</SectionLabel>
                {tags.slice(0, 15).map((t) => (
                  <div key={t.id} className="group flex items-center rounded-xl mb-0.5 transition-colors"
                    style={{ background: filters.tag === t.id ? 'var(--an-sidebar-acc)' : 'transparent' }}>
                    <button
                      onClick={() => onFilterChange({ tag: filters.tag === t.id ? '' : t.id })}
                      className="flex-1 text-left text-sm px-3 py-1.5 truncate"
                      style={{ color: filters.tag === t.id ? 'var(--an-fg)' : 'var(--an-muted)' }}
                    >
                      #{t.name}
                    </button>
                    <button onClick={() => renameTag(t)} className="opacity-0 group-hover:opacity-100 text-xs px-1 transition-opacity" style={{ color: 'var(--an-muted)' }}>✎</button>
                    <button onClick={() => deleteTag(t)} className="opacity-0 group-hover:opacity-100 text-xs px-1 pr-2 transition-opacity" style={{ color: 'var(--an-muted)' }}>✕</button>
                  </div>
                ))}
              </>
            )}

            {/* Backup */}
            <Divider />
            <button
              onClick={() => setShowBackup((v) => !v)}
              className="w-full text-left text-xs px-3 py-2 rounded-xl transition-colors"
              style={{ color: 'var(--an-muted)' }}
            >
              {showBackup ? '▲' : '▼'} Backup & Herstel
            </button>
            {showBackup && (
              <div className="space-y-1 px-1">
                <button onClick={handleExport} disabled={busy}
                  className="w-full text-left text-xs px-3 py-2 rounded-xl disabled:opacity-50"
                  style={{ background: 'var(--an-sidebar-acc)', color: 'var(--an-fg)' }}>
                  ⬇ Exporteer backup
                </button>
                <button onClick={() => importRef.current?.click()} disabled={busy}
                  className="w-full text-left text-xs px-3 py-2 rounded-xl disabled:opacity-50"
                  style={{ background: 'var(--an-sidebar-acc)', color: 'var(--an-fg)' }}>
                  ⬆ Herstel backup
                </button>
                <input ref={importRef} type="file" accept=".zip" className="hidden" onChange={handleImportFile} />
                <div className="pt-1">
                  <ApiKeyManager />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-3 py-3 space-y-0.5 border-t" style={{ borderColor: 'var(--an-sidebar-bdr)' }}>
        <NavItem icon="⚙" label="Instellingen" active={false} onClick={onOpenSettings} collapsed={collapsed} />
        <NavItem icon="🍅" label="Pomodoro" active={pomodoroActive} onClick={onTogglePomodoro} collapsed={collapsed} />
        <NavItem
          icon={theme === 'dark' ? '🌙' : '☀️'}
          label={theme === 'dark' ? 'Donkere modus' : 'Lichte modus'}
          active={false}
          onClick={onToggleTheme}
          collapsed={collapsed}
        />

        {/* User avatar button */}
        <button
          onClick={onSwitchUser}
          className="w-full flex items-center rounded-xl text-sm transition-all duration-200 mt-1"
          style={{
            gap: collapsed ? 0 : '0.75rem',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0.5rem' : '0.5rem 0.75rem',
          }}
          title={collapsed ? user?.name : 'Wissel gebruiker'}
        >
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'var(--an-accent)', color: '#fff' }}
          >
            {user?.name?.[0]?.toUpperCase() || '?'}
          </span>
          {!collapsed && (
            <span className="flex-1 text-left text-sm truncate" style={{ color: 'var(--an-fg)' }}>
              {user?.name}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

function NewNoteButton({ onClick, collapsed }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center font-semibold text-sm transition-all duration-200 mb-3 rounded-2xl border-2"
      style={{
        gap: collapsed ? 0 : '0.5rem',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '0.625rem' : '0.625rem 0.875rem',
        borderStyle: hovered ? 'solid' : 'dashed',
        borderColor: 'var(--an-accent)',
        background: hovered ? 'var(--an-accent)' : 'color-mix(in srgb, var(--an-accent) 8%, transparent)',
        color: hovered ? '#fff' : 'var(--an-accent)',
        boxShadow: hovered ? '0 4px 12px color-mix(in srgb, var(--an-accent) 35%, transparent)' : 'none',
      }}
      title={collapsed ? 'Nieuwe notitie' : undefined}
    >
      <span className="text-lg font-bold leading-none shrink-0">+</span>
      {!collapsed && <span>Nieuwe notitie</span>}
    </button>
  );
}

function Divider() {
  return <div className="my-3 border-t" style={{ borderColor: 'var(--an-sidebar-bdr)' }} />;
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider px-1 mb-1.5" style={{ color: 'var(--an-muted)' }}>
      {children}
    </p>
  );
}

function FilterButton({ active, onClick, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left text-sm px-3 py-1.5 rounded-xl mb-0.5 truncate transition-all duration-150"
      style={{
        background: active ? 'var(--an-sidebar-acc)' : hovered ? 'var(--an-sidebar-acc)' : 'transparent',
        color: active ? 'var(--an-fg)' : 'var(--an-muted)',
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}
