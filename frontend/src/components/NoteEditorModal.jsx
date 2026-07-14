import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { COLORS, colorClasses, stripHtml } from '../lib/utils.jsx';
import { useAutoSave } from '../lib/useAutoSave.js';
import RichTextEditor from './RichTextEditor.jsx';
import TaskChecklist from './TaskChecklist.jsx';
import SaveStatus from './SaveStatus.jsx';

const EMPTY_NOTE = {
  title: '',
  content: '',
  type: 'note',
  category_id: null,
  color: 'yellow',
  due_date: null,
  tasks: [],
  tags: [],
};

function isNotePayloadEmpty(payload) {
  const hasTitle = Boolean(payload.title?.trim());
  const hasContent = Boolean(stripHtml(payload.content || '').trim());
  const hasTasks = Array.isArray(payload.tasks) && payload.tasks.some((t) => t.text?.trim());
  return !hasTitle && !hasContent && !hasTasks;
}

export default function NoteEditorModal({
  noteId,
  initialColumnId,
  categories,
  tags,
  onClose,
  onAutosaved,
  onDeleted,
  onTagsChanged,
}) {
  const [note, setNote] = useState(() => ({
    ...EMPTY_NOTE,
    kanban_column_id: initialColumnId || null,
  }));
  const [savedId, setSavedId] = useState(noteId);
  const [loading, setLoading] = useState(!!noteId);
  const [tagDraft, setTagDraft] = useState('');
  const noteRef = useRef(note);
  const closingRef = useRef(false);

  noteRef.current = note;

  const getPayload = useCallback(() => noteRef.current, []);

  const saveNote = useCallback(
    (id, payload) => (id ? api.updateNote(id, payload) : api.createNote(payload)),
    []
  );

  const handleSaveSuccess = useCallback(
    (saved) => {
      setSavedId(saved.id);
      onAutosaved(saved);
    },
    [onAutosaved]
  );

  const { status, scheduleSave, flushSave, markLoaded } = useAutoSave({
    enabled: !loading,
    getPayload,
    savedId,
    saveNote,
    onSuccess: handleSaveSuccess,
    debounceMs: 1000,
    isEmpty: isNotePayloadEmpty,
  });

  useEffect(() => {
    setSavedId(noteId);
    if (!noteId) {
      setNote(EMPTY_NOTE);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getNote(noteId).then((data) => {
      setNote(data);
      markLoaded(data);
      setLoading(false);
    });
  }, [noteId, markLoaded]);

  function update(patch) {
    setNote((prev) => ({ ...prev, ...patch }));
    scheduleSave();
  }

  async function addTag(name) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const current = noteRef.current;
    if (current.tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      setTagDraft('');
      return;
    }

    const existing = tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    const tag = existing || (await api.createTag(trimmed));
    if (!existing) onTagsChanged();

    setNote((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    setTagDraft('');
    scheduleSave();
  }

  function removeTag(id) {
    setNote((prev) => ({ ...prev, tags: prev.tags.filter((t) => t.id !== id) }));
    scheduleSave();
  }

  async function handleClose() {
    if (closingRef.current) return;
    closingRef.current = true;
    await flushSave();
    onClose();
  }

  async function handleDelete() {
    if (!savedId) return handleClose();
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    await api.deleteNote(savedId);
    onDeleted(savedId);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={handleClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading…</p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <input
                autoFocus
                type="text"
                value={note.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Title"
                className="flex-1 text-xl font-semibold bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              />
              <SaveStatus status={status} />
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl px-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                <button
                  onClick={() => update({ type: 'note' })}
                  className={`px-3 py-1 text-sm ${note.type === 'note' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                >
                  📝 Note
                </button>
                <button
                  onClick={() => update({ type: 'task' })}
                  className={`px-3 py-1 text-sm ${note.type === 'task' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                >
                  ✓ Task
                </button>
              </div>

              <select
                value={note.category_id || ''}
                onChange={(e) => update({ category_id: e.target.value || null })}
                className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {note.type === 'task' && (
                <input
                  type="date"
                  value={note.due_date ? note.due_date.slice(0, 10) : ''}
                  onChange={(e) => update({ due_date: e.target.value || null })}
                  className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1"
                />
              )}

              <div className="flex items-center gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    title={c}
                    onClick={() => update({ color: c })}
                    className={`w-6 h-6 rounded-full ${colorClasses(c)} ${
                      note.color === c ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {note.tags.map((t) => (
                <span
                  key={t.id}
                  className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-1"
                >
                  #{t.name}
                  <button onClick={() => removeTag(t.id)} className="text-gray-400 hover:text-red-500">
                    ✕
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagDraft);
                  }
                }}
                list="tag-suggestions"
                placeholder="Add tag…"
                className="text-xs px-2 py-1 rounded-full bg-transparent border border-dashed border-gray-300 dark:border-gray-600 outline-none text-gray-700 dark:text-gray-200 w-28"
              />
              <datalist id="tag-suggestions">
                {tags.map((t) => (
                  <option key={t.id} value={t.name} />
                ))}
              </datalist>
            </div>

            {note.type === 'task' && (
              <div className="mb-4">
                <TaskChecklist tasks={note.tasks} onChange={(tasks) => update({ tasks })} />
              </div>
            )}

            <RichTextEditor content={note.content} onChange={(content) => update({ content })} />

            <div className="flex items-center justify-between mt-5">
              <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-600">
                {savedId ? 'Delete' : 'Cancel'}
              </button>
              <p className="text-xs text-gray-400">Changes save automatically</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
