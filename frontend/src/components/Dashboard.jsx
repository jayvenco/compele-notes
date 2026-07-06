import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import NoteCard from './NoteCard.jsx';

const PAGE_SIZE = 20;

export default function Dashboard({ filters, categories, onOpenNote, refreshKey }) {
  const [notes, setNotes] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef(null);
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const loadPage = useCallback(
    async (pageToLoad, replace) => {
      setLoading(true);
      try {
        const { notes: pageNotes } = await api.listNotes({ ...filters, page: pageToLoad, pageSize: PAGE_SIZE });
        setNotes((prev) => (replace ? pageNotes : [...prev, ...pageNotes]));
        setHasMore(pageNotes.length === PAGE_SIZE);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    setPage(1);
    loadPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, refreshKey]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((p) => {
            const next = p + 1;
            loadPage(next, false);
            return next;
          });
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadPage]);

  if (!loading && notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-500">
        <p className="text-4xl mb-2">🗒️</p>
        <p>No notes match your filters yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="masonry-columns">
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            categoryName={categoryMap[note.category_id]}
            searchTerm={filters.search}
            onClick={() => onOpenNote(note.id)}
          />
        ))}
      </div>
      <div ref={sentinelRef} className="h-10" />
      {loading && <p className="text-center text-sm text-gray-400 py-4">Loading…</p>}
      {!hasMore && notes.length > 0 && (
        <p className="text-center text-sm text-gray-400 py-4">You've reached the end.</p>
      )}
    </div>
  );
}
