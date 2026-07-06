import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Debounced auto-save hook.
 * Returns save status and helpers to schedule or flush a save immediately.
 */
export function useAutoSave({ enabled, getPayload, savedId, saveNote, onSuccess, debounceMs = 1000, isEmpty }) {
  const [status, setStatus] = useState('idle'); // idle | pending | saving | saved | error
  const savedIdRef = useRef(savedId);
  const lastSavedJsonRef = useRef(null);
  const timerRef = useRef(null);
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  const saveNoteRef = useRef(saveNote);

  onSuccessRef.current = onSuccess;
  saveNoteRef.current = saveNote;

  useEffect(() => {
    savedIdRef.current = savedId;
  }, [savedId]);

  const buildPayload = useCallback(() => {
    const note = getPayload();
    return {
      title: note.title,
      content: note.content,
      type: note.type,
      category_id: note.category_id || null,
      color: note.color,
      due_date: note.type === 'task' ? note.due_date : null,
      tasks: note.type === 'task' ? note.tasks : [],
      tag_ids: note.tags.map((t) => t.id),
    };
  }, [getPayload]);

  const performSave = useCallback(async () => {
    if (!enabled || savingRef.current) {
      if (enabled) queuedRef.current = true;
      return;
    }

    const payload = buildPayload();
    const payloadJson = JSON.stringify(payload);

    if (isEmpty(payload)) {
      setStatus('idle');
      return;
    }

    if (payloadJson === lastSavedJsonRef.current) {
      setStatus('saved');
      return;
    }

    savingRef.current = true;
    setStatus('saving');

    try {
      const saved = await saveNoteRef.current(savedIdRef.current, payload);
      savedIdRef.current = saved.id;
      lastSavedJsonRef.current = payloadJson;
      onSuccessRef.current(saved);
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      savingRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        performSave();
      }
    }
  }, [enabled, buildPayload, isEmpty]);

  const scheduleSave = useCallback(() => {
    if (!enabled) return;
    setStatus((s) => (s === 'saving' ? 'saving' : 'pending'));
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(performSave, debounceMs);
  }, [enabled, performSave, debounceMs]);

  const flushSave = useCallback(async () => {
    clearTimeout(timerRef.current);
    await performSave();
  }, [performSave]);

  const markLoaded = useCallback((note) => {
    lastSavedJsonRef.current = JSON.stringify({
      title: note.title,
      content: note.content,
      type: note.type,
      category_id: note.category_id || null,
      color: note.color,
      due_date: note.type === 'task' ? note.due_date : null,
      tasks: note.type === 'task' ? note.tasks : [],
      tag_ids: (note.tags || []).map((t) => t.id),
    });
    setStatus('saved');
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    const retryOnReconnect = () => {
      const payload = buildPayload();
      if (!isEmpty(payload) && JSON.stringify(payload) !== lastSavedJsonRef.current) {
        scheduleSave();
      }
    };
    window.addEventListener('online', retryOnReconnect);
    return () => window.removeEventListener('online', retryOnReconnect);
  }, [buildPayload, isEmpty, scheduleSave]);

  return { status, scheduleSave, flushSave, markLoaded };
}
