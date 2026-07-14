const BASE = '/api';

function getUserId() {
  return localStorage.getItem('notes.userId') || '';
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const userId = getUserId();
  if (userId) headers['x-user-id'] = userId;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.blob();
}

export const api = {
  listUsers: () => request('/users'),
  createUser: (name) => request('/users', { method: 'POST', body: JSON.stringify({ name }) }),

  listCategories: () => request('/categories'),
  createCategory: (name) => request('/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  renameCategory: (id, name) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  listTags: () => request('/tags'),
  createTag: (name) => request('/tags', { method: 'POST', body: JSON.stringify({ name }) }),
  renameTag: (id, name) => request(`/tags/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteTag: (id) => request(`/tags/${id}`, { method: 'DELETE' }),

  listNotes: (params) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== ''))
    );
    return request(`/notes?${query.toString()}`);
  },
  getNote: (id) => request(`/notes/${id}`),
  createNote: (note) => request('/notes', { method: 'POST', body: JSON.stringify(note) }),
  updateNote: (id, note) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(note) }),
  deleteNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),

  uploadImage: (file) => {
    const form = new FormData();
    form.append('image', file);
    return request('/images', { method: 'POST', body: form });
  },

  getSettings: () => request('/settings'),
  updateSettings: (settings) => request('/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  exportBackup: async () => {
    const userId = getUserId();
    const res = await fetch(`${BASE}/backup/export`, { headers: { 'x-user-id': userId } });
    if (!res.ok) throw new Error('Backup export failed');
    return res.blob();
  },
  // Boards
  listBoards: () => request('/boards'),
  createBoard: (name) => request('/boards', { method: 'POST', body: JSON.stringify({ name }) }),
  getBoard: (id) => request(`/boards/${id}`),
  renameBoard: (id, name) => request(`/boards/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteBoard: (id) => request(`/boards/${id}`, { method: 'DELETE' }),
  addColumn: (boardId, name, color) =>
    request(`/boards/${boardId}/columns`, { method: 'POST', body: JSON.stringify({ name, color }) }),
  updateColumn: (boardId, colId, patch) =>
    request(`/boards/${boardId}/columns/${colId}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteColumn: (boardId, colId) =>
    request(`/boards/${boardId}/columns/${colId}`, { method: 'DELETE' }),
  moveCard: (boardId, note_id, column_id, position) =>
    request(`/boards/${boardId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ note_id, column_id, position }),
    }),

  // API keys
  listApiKeys: () => request('/keys'),
  createApiKey: (name) => request('/keys', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteApiKey: (id) => request(`/keys/${id}`, { method: 'DELETE' }),

  importBackup: async (file) => {
    const form = new FormData();
    form.append('backup', file);
    const userId = getUserId();
    const res = await fetch(`${BASE}/backup/import`, {
      method: 'POST',
      headers: { 'x-user-id': userId },
      body: form,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Backup import failed');
    }
    return res.json();
  },
};

export function setCurrentUserId(id) {
  localStorage.setItem('notes.userId', id);
}

export function clearCurrentUserId() {
  localStorage.removeItem('notes.userId');
}

export { getUserId };
