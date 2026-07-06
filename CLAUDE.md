# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Docker — production (uses pre-built GHCR images):**
```bash
# Requires GITHUB_USER env var or .env file (see .env.example)
docker compose up -d               # pull images and start
docker compose pull && docker compose up -d   # update to latest
docker compose down -v             # full reset including volumes
```

**Docker — build from source (dev/local):**
```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up --build
```

**Backend (dev, requires Node 20):**
```bash
cd backend && npm install
node src/index.js                  # starts on :4000
node --watch src/index.js          # with file-watching
```

**Frontend (dev):**
```bash
cd frontend && npm install
npm run dev                        # starts on :5173, proxies /api and /uploads to :4000
npm run build                      # production build into dist/
```

Both backend and frontend must be running simultaneously for local development. The Vite proxy (`vite.config.js`) forwards `/api/*` and `/uploads/*` to the backend, so no CORS config is needed in dev.

> **Node version:** `better-sqlite3` compiles a native binding and does not build on Node 26+. Use Node 20 locally and in the Docker image (`FROM node:20-alpine`).

## Architecture

### Request flow
```
Browser → nginx (:80) → /api/* → backend Express (:4000)
                       → /uploads/* → backend Express (:4000) static
                       → /* → SPA index.html (React)
```
In production (Docker), the frontend image runs nginx and reverse-proxies to the `backend` service. In dev, Vite does the proxying.

### Authentication
No passwords or sessions. The user picks a display name; the backend creates or returns a `users` row. The resulting `user.id` (UUID) is stored in `localStorage` as `notes.userId` and sent as the `x-user-id` header on every API request. `backend/src/middleware.js:requireUser` validates it against the DB on every protected route.

### Backend (`backend/src/`)
- **`db.js`** — opens/creates `notes.db` via `better-sqlite3` (WAL mode), defines the full schema, and exports the `db` singleton plus `DATA_DIR` and `UPLOADS_DIR` paths. Schema migrations are not implemented; schema changes require dropping and recreating tables.
- **`routes/notes.js`** — the largest route file. Notes list endpoint builds a dynamic SQL query with optional `WHERE` clauses for search (title, content, tags, category via `EXISTS` subqueries), category, tag, type, color, and `completed` status filters, with `LIMIT`/`OFFSET` pagination. Note tags are stored in the `note_tags` join table and re-synced on every PUT by `setNoteTags`.
- **`routes/backup.js`** — export zips `notes.db` + `uploads/` via `adm-zip`. Import writes the replacement DB file and restarts the process (`process.exit(0)`); Docker's `restart: unless-stopped` brings it back. **This means a restore causes a brief downtime.**
- Tasks are stored as a JSON array (`tasks_json TEXT`) on the note row — not a separate table.
- Images are uploaded via `multer` to `UPLOADS_DIR` with a UUID filename, then served as static files. Their paths (`/uploads/<uuid>.ext`) are embedded directly in note HTML content via Tiptap's Image extension.

### Frontend (`frontend/src/`)
- **`App.jsx`** — top-level state: current user, theme, categories, tags list, active filters, `refreshKey` (incremented to trigger Dashboard re-fetch), and which note is open for editing (`editingNoteId`: `undefined` = closed, `null` = new note, UUID = editing existing).
- **`lib/api.js`** — all `fetch` calls. Reads `notes.userId` from localStorage and injects the `x-user-id` header automatically.
- **`lib/utils.jsx`** — `.jsx` (not `.js`) because `highlightText` returns React elements with `<mark>` for search result highlighting.
- **`components/Dashboard.jsx`** — infinite scroll via `IntersectionObserver` on a sentinel `<div>`. Filter/search changes reset to page 1 via a `useEffect` dep on `filters` and `refreshKey`.
- **`components/RichTextEditor.jsx`** — Tiptap editor with StarterKit, Underline, Link (autolink), Image, and Placeholder extensions. Image paste and drag-drop are handled in `editorProps.handlePaste` / `handleDrop`; files are uploaded via `api.uploadImage` and the returned URL is inserted as an image node.
- **`components/NoteEditorModal.jsx`** — controls note type (note/task), color picker, category select, inline tag creation (tags created on-the-fly via API), due date, and delegates content editing to `RichTextEditor` or `TaskChecklist` depending on type.

### Masonry layout
CSS `column-count` (1→2→3→4 columns at `sm`/`lg`/`xl` breakpoints) with `break-inside: avoid` on each card. Defined in `frontend/src/index.css` under `.masonry-columns` / `.masonry-item`.

### Dark mode
Toggled by adding/removing the `dark` class on `<html>` (Tailwind `darkMode: 'class'`). Persisted in `localStorage` as `notes.theme`. Note card background colors are defined as a nested `note` color palette in `tailwind.config.js` and referenced via `colorClasses(color)` in `utils.jsx`.

### Data persistence (Docker)
Two named volumes in `docker-compose.yml`:
- `notes-data` → `/app/data` (SQLite DB)
- `notes-uploads` → `/app/uploads` (image files)

Override to bind-mount paths (e.g. Unraid `/mnt/user/appdata/`) via `NOTES_DATA` and `NOTES_UPLOADS` env vars.

### CI/CD — GitHub Actions (`.github/workflows/docker-publish.yml`)
Triggers on push to `main`. Builds `backend` and `frontend` images for `linux/amd64` and `linux/arm64` using QEMU, caches layers via GitHub Actions cache, and pushes to:
- `ghcr.io/<owner>/notes-app-backend:latest`
- `ghcr.io/<owner>/notes-app-frontend:latest`

The `docker-compose.yml` pulls from these GHCR paths using `${GITHUB_USER}` as the owner. After the first push, make both GHCR packages public (Packages → Package settings → Change visibility → Public) so Unraid/Docker hosts can pull without authenticating.
