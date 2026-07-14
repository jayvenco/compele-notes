import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function ApiKeyManager() {
  const [keys, setKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealed, setRevealed] = useState(null); // { id, key }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.listApiKeys().then(setKeys).catch(() => {});
  }, []);

  async function generate() {
    const name = newKeyName.trim() || 'Mijn sleutel';
    setBusy(true);
    try {
      const created = await api.createApiKey(name);
      setKeys((prev) => [created, ...prev]);
      setRevealed({ id: created.id, key: created.key });
      setNewKeyName('');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id) {
    if (!window.confirm('API-sleutel intrekken? Dit kan niet ongedaan worden.')) return;
    await api.deleteApiKey(id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
    if (revealed?.id === id) setRevealed(null);
  }

  function copyKey(key) {
    navigator.clipboard.writeText(key);
  }

  return (
    <div className="space-y-3">
      {revealed && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 p-3 text-xs">
          <p className="font-semibold text-green-800 dark:text-green-200 mb-1">
            Kopieer je sleutel nu — hij wordt niet opnieuw getoond.
          </p>
          <div className="flex items-center gap-1">
            <code className="flex-1 break-all text-green-900 dark:text-green-100 bg-green-100 dark:bg-green-900/50 rounded px-1.5 py-1">
              {revealed.key}
            </code>
            <button
              onClick={() => copyKey(revealed.key)}
              className="shrink-0 px-2 py-1 rounded bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 hover:bg-green-300"
              title="Kopiëren"
            >
              📋
            </button>
          </div>
          <button
            onClick={() => setRevealed(null)}
            className="mt-1 text-green-700 dark:text-green-300 hover:underline"
          >
            Sluiten
          </button>
        </div>
      )}

      {keys.length > 0 && (
        <ul className="space-y-1">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center gap-2 group text-sm">
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 dark:text-gray-100 truncate">{k.name}</p>
                <p className="text-xs text-gray-400 font-mono">{k.key_prefix}…</p>
              </div>
              <button
                onClick={() => revoke(k.id)}
                className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 shrink-0"
                title="Intrekken"
              >
                Intrekken
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-1">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generate()}
          placeholder="Naam (bijv. Home Assistant)"
          className="flex-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-gray-900 dark:text-gray-100"
        />
        <button
          onClick={generate}
          disabled={busy}
          className="text-xs px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 shrink-0"
        >
          Genereer
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Gebruik de sleutel als:{' '}
        <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Authorization: Bearer &lt;key&gt;</code>
      </p>
    </div>
  );
}
