import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { COLORS, COLUMN_COLORS } from '../lib/utils.jsx';
import KanbanCard from './KanbanCard.jsx';

export default function KanbanColumn({ boardId, column, onOpenNote, onRename, onRecolor, onDelete, onAddCard, hideHeader }) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(column.name);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const colColor = COLUMN_COLORS[column.color] || COLUMN_COLORS.gray;

  function commitRename() {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== column.name) onRename(column.id, trimmed);
    setEditingName(false);
  }

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header — hidden in swimlane mode (shown once at top of board) */}
      {!hideHeader && (
        <div className={`rounded-t-xl px-3 py-2 border border-b-0 ${colColor} flex items-center gap-2`}>
          {editingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingName(false); }}
              className="flex-1 bg-transparent outline-none text-sm font-semibold text-gray-900 dark:text-gray-100"
            />
          ) : (
            <button
              onClick={() => { setNameDraft(column.name); setEditingName(true); }}
              className="flex-1 text-left text-sm font-semibold text-gray-800 dark:text-gray-100 hover:opacity-70"
            >
              {column.name}
            </button>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">{column.notes.length}</span>

          <div className="relative">
            <button
              onClick={() => setShowColorPicker((v) => !v)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs px-1"
              title="Kleur"
            >
              🎨
            </button>
            {showColorPicker && (
              <div className="absolute right-0 top-6 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 w-24 border border-gray-200 dark:border-gray-700">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    title={c}
                    onClick={() => { onRecolor(column.id, c); setShowColorPicker(false); }}
                    className={`w-6 h-6 rounded-full bg-note-${c}-light dark:bg-note-${c}-dark ${column.color === c ? 'ring-2 ring-blue-500' : ''}`}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => { if (window.confirm(`Kolom "${column.name}" verwijderen?`)) onDelete(column.id); }}
            className="text-gray-400 hover:text-red-500 text-xs px-0.5"
            title="Verwijderen"
          >
            ✕
          </button>
        </div>
      )}

      {/* Cards drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-20 ${hideHeader ? 'rounded-xl' : 'rounded-b-xl'} border ${colColor} p-2 flex flex-col gap-2 transition-colors ${isOver ? 'ring-2 ring-blue-400' : ''}`}
      >
        <SortableContext items={column.notes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          {column.notes.map((note) => (
            <KanbanCard
              key={note.id}
              note={note}
              onOpen={() => onOpenNote(note.id)}
            />
          ))}
        </SortableContext>

        <button
          onClick={() => onAddCard(column.id)}
          className="mt-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-left"
        >
          + Nieuwe kaart
        </button>
      </div>
    </div>
  );
}
