import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { api } from '../lib/api.js';
import { colorClasses, stripHtml } from '../lib/utils.jsx';
import KanbanColumn from './KanbanColumn.jsx';

function findColumn(columns, noteId) {
  return columns.find((col) => col.notes.some((n) => n.id === noteId));
}

export default function KanbanBoard({ onOpenNote, onNewNote, refreshKey }) {
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [board, setBoard] = useState(null);
  const [activeNote, setActiveNote] = useState(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const loadBoards = useCallback(async () => {
    const list = await api.listBoards();
    setBoards(list);
    if (list.length && !activeBoardId) setActiveBoardId(list[0].id);
    setLoading(false);
  }, [activeBoardId]);

  useEffect(() => { loadBoards(); }, []);

  useEffect(() => {
    if (!activeBoardId) return;
    api.getBoard(activeBoardId).then(setBoard);
  }, [activeBoardId, refreshKey]);

  async function createBoard() {
    const name = newBoardName.trim() || 'New Board';
    const created = await api.createBoard(name);
    setBoards((prev) => [...prev, { id: created.id, name: created.name }]);
    setActiveBoardId(created.id);
    setBoard(created);
    setNewBoardName('');
  }

  async function deleteBoard(boardId) {
    if (!window.confirm('Dit board en alle kolomindeling verwijderen?')) return;
    await api.deleteBoard(boardId);
    const updated = boards.filter((b) => b.id !== boardId);
    setBoards(updated);
    const next = updated[0]?.id || null;
    setActiveBoardId(next);
    setBoard(null);
    if (next) api.getBoard(next).then(setBoard);
  }

  async function addColumn() {
    const col = await api.addColumn(activeBoardId, 'Nieuwe kolom', 'gray');
    setBoard((prev) => ({ ...prev, columns: [...prev.columns, { ...col, notes: [] }] }));
  }

  async function renameColumn(colId, name) {
    await api.updateColumn(activeBoardId, colId, { name });
    setBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.id === colId ? { ...c, name } : c)),
    }));
  }

  async function recolorColumn(colId, color) {
    await api.updateColumn(activeBoardId, colId, { color });
    setBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.id === colId ? { ...c, color } : c)),
    }));
  }

  async function deleteColumn(colId) {
    await api.deleteColumn(activeBoardId, colId);
    setBoard((prev) => ({
      ...prev,
      columns: prev.columns.filter((c) => c.id !== colId),
    }));
  }

  function handleDragStart(event) {
    const { active } = event;
    const col = findColumn(board.columns, active.id);
    const note = col?.notes.find((n) => n.id === active.id);
    setActiveNote(note || null);
  }

  function handleDragOver(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setBoard((prev) => {
      const cols = prev.columns;
      const srcCol = findColumn(cols, active.id);
      // over.id could be a column id or a note id
      const dstCol =
        cols.find((c) => c.id === over.id) || findColumn(cols, over.id);

      if (!srcCol || !dstCol || srcCol.id === dstCol.id) return prev;

      const note = srcCol.notes.find((n) => n.id === active.id);
      return {
        ...prev,
        columns: cols.map((c) => {
          if (c.id === srcCol.id) return { ...c, notes: c.notes.filter((n) => n.id !== active.id) };
          if (c.id === dstCol.id) return { ...c, notes: [...c.notes, note] };
          return c;
        }),
      };
    });
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveNote(null);
    if (!over) return;

    setBoard((prev) => {
      const cols = prev.columns;
      const srcCol = findColumn(cols, active.id);
      const dstCol =
        cols.find((c) => c.id === over.id) || findColumn(cols, over.id);

      if (!srcCol || !dstCol) return prev;

      let updatedCols;
      if (srcCol.id === dstCol.id) {
        const oldIdx = srcCol.notes.findIndex((n) => n.id === active.id);
        const newIdx = dstCol.notes.findIndex((n) => n.id === over.id);
        if (oldIdx === newIdx) return prev;
        const reordered = arrayMove(srcCol.notes, oldIdx, newIdx);
        updatedCols = cols.map((c) => (c.id === srcCol.id ? { ...c, notes: reordered } : c));
      } else {
        updatedCols = cols;
      }

      // Persist to backend
      const finalDstCol = updatedCols.find((c) => c.id === dstCol.id);
      const position = finalDstCol.notes.findIndex((n) => n.id === active.id);
      api.moveCard(activeBoardId, active.id, finalDstCol.id, position);

      return { ...prev, columns: updatedCols };
    });
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-gray-400">Laden…</div>;
  }

  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-500 dark:text-gray-400">Nog geen boards. Maak er een aan.</p>
        <button
          onClick={() => { setNewBoardName('My Board'); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          + Nieuw board
        </button>
        {newBoardName !== '' && (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createBoard()}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
            />
            <button onClick={createBoard} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">Aanmaken</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Board tabs + actions */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {boards.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveBoardId(b.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              b.id === activeBoardId
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {b.name}
          </button>
        ))}
        <button
          onClick={createBoard}
          className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          + Board
        </button>
        {activeBoardId && (
          <button
            onClick={() => deleteBoard(activeBoardId)}
            className="ml-auto text-xs text-gray-400 hover:text-red-500"
          >
            Board verwijderen
          </button>
        )}
      </div>

      {/* Columns */}
      {board && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 items-start">
            {board.columns.map((col) => (
              <KanbanColumn
                key={col.id}
                boardId={activeBoardId}
                column={col}
                onOpenNote={onOpenNote}
                onRename={renameColumn}
                onRecolor={recolorColumn}
                onDelete={deleteColumn}
                onAddCard={(columnId) => onNewNote(columnId)}
              />
            ))}

            <button
              onClick={addColumn}
              className="shrink-0 w-72 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:border-gray-400 text-sm"
            >
              + Kolom toevoegen
            </button>
          </div>

          <DragOverlay>
            {activeNote && (
              <div className={`rounded-xl p-3 shadow-lg border border-black/5 dark:border-white/10 w-72 ${colorClasses(activeNote.color)}`}>
                <p className="font-medium text-sm text-gray-900 dark:text-gray-50 line-clamp-2">
                  {activeNote.title || 'Untitled'}
                </p>
                {stripHtml(activeNote.content).slice(0, 80) && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                    {stripHtml(activeNote.content).slice(0, 80)}
                  </p>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
