import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { api } from '../lib/api.js';
import { colorClasses, stripHtml, COLUMN_COLORS } from '../lib/utils.jsx';
import KanbanColumn from './KanbanColumn.jsx';

const NO_LANE = 'none';

function LaneLabel({ lane, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(lane.name);

  function save() {
    if (nameVal.trim()) onRename(lane.id, nameVal.trim());
    setEditing(false);
  }

  return (
    <div className="group flex items-center gap-1.5 pr-3">
      {editing ? (
        <input
          autoFocus
          className="text-sm font-semibold bg-transparent border-b border-blue-500 outline-none text-gray-800 dark:text-gray-100 w-full min-w-0"
          value={nameVal}
          onChange={(e) => setNameVal(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        />
      ) : (
        <button
          className="text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-blue-500 text-left break-words w-full"
          onClick={() => { setEditing(true); setNameVal(lane.name); }}
        >
          {lane.name}
        </button>
      )}
      <button
        onClick={() => onDelete(lane.id)}
        className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 shrink-0"
        title="Lane verwijderen"
      >
        ✕
      </button>
    </div>
  );
}

export default function KanbanBoard({ onOpenNote, onNewNote, refreshKey }) {
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [board, setBoard] = useState(null);
  const [activeNote, setActiveNote] = useState(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [loading, setLoading] = useState(true);
  const activeLaneRef = useRef(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
    if (!window.confirm('Dit board verwijderen?')) return;
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
    setBoard((prev) => ({ ...prev, columns: [...prev.columns, col] }));
  }

  async function addLane() {
    const lane = await api.addLane(activeBoardId, 'Nieuwe lane');
    setBoard((prev) => ({ ...prev, lanes: [...prev.lanes, lane] }));
  }

  async function renameLane(laneId, name) {
    await api.updateLane(activeBoardId, laneId, name);
    setBoard((prev) => ({ ...prev, lanes: prev.lanes.map((l) => l.id === laneId ? { ...l, name } : l) }));
  }

  async function deleteLane(laneId) {
    if (!window.confirm('Lane verwijderen? Kaarten worden losgekoppeld.')) return;
    await api.deleteLane(activeBoardId, laneId);
    setBoard((prev) => {
      const cells = { ...prev.cells };
      delete cells[laneId];
      return { ...prev, lanes: prev.lanes.filter((l) => l.id !== laneId), cells };
    });
  }

  async function renameColumn(colId, name) {
    await api.updateColumn(activeBoardId, colId, { name });
    setBoard((prev) => ({ ...prev, columns: prev.columns.map((c) => c.id === colId ? { ...c, name } : c) }));
  }

  async function recolorColumn(colId, color) {
    await api.updateColumn(activeBoardId, colId, { color });
    setBoard((prev) => ({ ...prev, columns: prev.columns.map((c) => c.id === colId ? { ...c, color } : c) }));
  }

  async function deleteColumn(colId) {
    await api.deleteColumn(activeBoardId, colId);
    setBoard((prev) => ({ ...prev, columns: prev.columns.filter((c) => c.id !== colId) }));
  }

  function makeDragHandlers(laneKey) {
    function handleDragStart(event) {
      activeLaneRef.current = laneKey;
      const notes = board.cells[laneKey] || {};
      let found = null;
      for (const colNotes of Object.values(notes)) {
        found = colNotes.find((n) => n.id === event.active.id);
        if (found) break;
      }
      setActiveNote(found || null);
    }

    function handleDragOver(event) {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setBoard((prev) => {
        const cells = prev.cells;
        const laneCells = cells[laneKey] || {};
        const srcColId = Object.keys(laneCells).find((cId) => laneCells[cId]?.some((n) => n.id === active.id));
        const dstColId = prev.columns.find((c) => c.id === over.id)?.id
          || Object.keys(laneCells).find((cId) => laneCells[cId]?.some((n) => n.id === over.id));

        if (!srcColId || !dstColId || srcColId === dstColId) return prev;

        const note = laneCells[srcColId].find((n) => n.id === active.id);
        const newLaneCells = {
          ...laneCells,
          [srcColId]: laneCells[srcColId].filter((n) => n.id !== active.id),
          [dstColId]: [...(laneCells[dstColId] || []), note],
        };
        return { ...prev, cells: { ...cells, [laneKey]: newLaneCells } };
      });
    }

    async function handleDragEnd(event) {
      const { active, over } = event;
      setActiveNote(null);
      if (!over) return;

      setBoard((prev) => {
        const cells = prev.cells;
        const laneCells = cells[laneKey] || {};
        const srcColId = Object.keys(laneCells).find((cId) => laneCells[cId]?.some((n) => n.id === active.id));
        const dstColId = prev.columns.find((c) => c.id === over.id)?.id
          || Object.keys(laneCells).find((cId) => laneCells[cId]?.some((n) => n.id === over.id));

        if (!srcColId || !dstColId) return prev;

        let newLaneCells = laneCells;
        if (srcColId === dstColId) {
          const oldIdx = laneCells[srcColId].findIndex((n) => n.id === active.id);
          const newIdx = laneCells[dstColId].findIndex((n) => n.id === over.id);
          if (oldIdx === newIdx) return prev;
          newLaneCells = { ...laneCells, [srcColId]: arrayMove(laneCells[srcColId], oldIdx, newIdx) };
        }

        const finalNotes = newLaneCells[dstColId] || [];
        const position = finalNotes.findIndex((n) => n.id === active.id);
        const laneId = laneKey === NO_LANE ? null : laneKey;
        api.moveCard(activeBoardId, active.id, dstColId, laneId, position);

        return { ...prev, cells: { ...cells, [laneKey]: newLaneCells } };
      });
    }

    return { handleDragStart, handleDragOver, handleDragEnd };
  }

  if (loading) return <div className="flex items-center justify-center py-24 text-gray-400">Laden…</div>;

  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-500 dark:text-gray-400">Nog geen boards. Maak er een aan.</p>
        <button onClick={() => setNewBoardName('My Board')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
          + Nieuw board
        </button>
        {newBoardName !== '' && (
          <div className="flex gap-2">
            <input autoFocus value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createBoard()}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100" />
            <button onClick={createBoard} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">Aanmaken</button>
          </div>
        )}
      </div>
    );
  }

  const haslanes = board?.lanes?.length > 0;
  const laneRows = haslanes ? board.lanes : [null];

  return (
    <div className="flex flex-col h-full">
      {/* Board tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {boards.map((b) => (
          <button key={b.id} onClick={() => setActiveBoardId(b.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${b.id === activeBoardId
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
            {b.name}
          </button>
        ))}
        <button onClick={createBoard}
          className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600">
          + Board
        </button>
        {activeBoardId && (
          <button onClick={() => deleteBoard(activeBoardId)} className="ml-auto text-xs text-gray-400 hover:text-red-500">
            Board verwijderen
          </button>
        )}
      </div>

      {board && (
        <>
          {/* Swimlane column header bar — shown once above all lanes */}
          {haslanes && (
            <div className="flex items-stretch gap-4 mb-0 overflow-x-auto">
              {/* Spacer matching lane-label column width */}
              <div className="w-36 shrink-0" />
              {/* Colored column headers */}
              {board.columns.map((col) => {
                const colColor = COLUMN_COLORS[col.color] || COLUMN_COLORS.gray;
                const totalCards = Object.values(board.cells).reduce(
                  (sum, laneCells) => sum + (laneCells[col.id]?.length || 0), 0
                );
                return (
                  <div key={col.id} className={`w-72 shrink-0 rounded-t-xl px-3 py-2.5 border border-b-0 ${colColor} flex items-center gap-2`}>
                    <button
                      onClick={() => { }}
                      className="flex-1 text-left text-sm font-semibold text-gray-800 dark:text-gray-100"
                    >
                      {col.name}
                    </button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{totalCards}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Strong divider below the column header bar */}
          {haslanes && (
            <div className="border-b-2 border-gray-300 dark:border-gray-600 mb-4" />
          )}

          {/* Lane rows */}
          {laneRows.map((lane, idx) => {
            const laneKey = lane?.id || NO_LANE;
            const { handleDragStart, handleDragOver, handleDragEnd } = makeDragHandlers(laneKey);
            return (
              <div key={laneKey}>
                {/* Separator between lanes */}
                {haslanes && idx > 0 && (
                  <div className="border-t-2 border-gray-200 dark:border-gray-700 my-4" />
                )}

                <div className={`flex items-start gap-4 ${haslanes ? 'py-1' : ''}`}>
                  {/* Lane label column */}
                  {haslanes && (
                    <div className="w-36 shrink-0 self-stretch flex items-center border-r-2 border-gray-200 dark:border-gray-700">
                      <LaneLabel
                        lane={lane}
                        onRename={renameLane}
                        onDelete={deleteLane}
                      />
                    </div>
                  )}

                  {/* Columns in their own DndContext */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex gap-4 overflow-x-auto pb-2 items-start flex-1">
                      {board.columns.map((col) => (
                        <KanbanColumn
                          key={`${laneKey}-${col.id}`}
                          boardId={activeBoardId}
                          column={{ ...col, notes: board.cells[laneKey]?.[col.id] || [] }}
                          onOpenNote={onOpenNote}
                          onRename={renameColumn}
                          onRecolor={recolorColumn}
                          onDelete={deleteColumn}
                          onAddCard={(colId) => onNewNote(colId, lane?.id || null)}
                          hideHeader={haslanes}
                        />
                      ))}
                    </div>
                    <DragOverlay>
                      {activeNote && (
                        <div className={`rounded-xl p-3 shadow-lg border border-black/5 dark:border-white/10 w-72 ${colorClasses(activeNote.color)}`}>
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-50 line-clamp-2">{activeNote.title || 'Untitled'}</p>
                          {stripHtml(activeNote.content).slice(0, 80) && (
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{stripHtml(activeNote.content).slice(0, 80)}</p>
                          )}
                        </div>
                      )}
                    </DragOverlay>
                  </DndContext>
                </div>
              </div>
            );
          })}

          {/* Add column / lane */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={addColumn}
              className="px-4 py-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:border-gray-400 text-sm">
              + Kolom
            </button>
            <button onClick={addLane}
              className="px-4 py-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:border-gray-400 text-sm">
              + Lane
            </button>
          </div>
        </>
      )}
    </div>
  );
}
