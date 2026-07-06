import { useEffect, useState } from 'react';
import { api, setCurrentUserId } from '../lib/api.js';

export default function Login({ onLogin }) {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a display name.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await api.createUser(trimmed);
      setCurrentUserId(user.id);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function selectUser(user) {
    setCurrentUserId(user.id);
    onLogin(user);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-semibold text-center mb-1 text-gray-900 dark:text-gray-100">
          📝 Notes
        </h1>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
          Sign in with just your name — no password needed.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 font-medium disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Continue'}
          </button>
        </form>

        {users.length > 0 && (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Existing profiles</p>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
