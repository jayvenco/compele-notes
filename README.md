# Notes App

Lichtgewicht, offline-first notitie-app. Inloggen met alleen een naam, notitieborden met rich text, afbeeldingen, taken, tags, categorieën en kleur. Zoeken, filteren en back-up/herstel ingebouwd.

**Stack:** React + Vite + TailwindCSS + Tiptap — Node.js + Express + SQLite — Docker

---

## Installeren op Unraid (via GitHub URL)

### Vereisten
1. **GitHub repository** — fork of kloon dit project naar je eigen GitHub account en push naar `main`. GitHub Actions bouwt automatisch de Docker images en plaatst ze op GHCR (GitHub Container Registry).
2. **GHCR packages publiek maken** — ga na de eerste push naar `github.com/JOUW_GEBRUIKER` → *Packages* → klik op het package → *Package settings* → *Change visibility* → *Public*. Anders heb je authenticatie nodig bij `docker pull`.

### Methode 1 — Terminal op Unraid (één commando)

```bash
GITHUB_USER=jouw-github-gebruikersnaam

docker compose \
  -f https://raw.githubusercontent.com/$GITHUB_USER/notes-app/main/docker-compose.yml \
  --env-file <(echo "GITHUB_USER=$GITHUB_USER") \
  up -d
```

Of download eerst de bestanden:

```bash
mkdir -p /mnt/user/appdata/notes && cd /mnt/user/appdata/notes

curl -O https://raw.githubusercontent.com/GITHUB_USER/notes-app/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/GITHUB_USER/notes-app/main/.env.example
cp .env.example .env
nano .env   # vul GITHUB_USER in, pas paden aan

docker compose up -d
```

### Methode 2 — Portainer (meest gebruikt op Unraid)

1. Portainer → **Stacks** → **Add Stack**
2. Kies **Git Repository**
3. Repository URL: `https://github.com/JOUW_GEBRUIKER/notes-app`
4. Compose path: `docker-compose.yml`
5. Voeg onder **Environment variables** toe:
   | Variable | Waarde |
   |---|---|
   | `GITHUB_USER` | jouw GitHub gebruikersnaam |
   | `NOTES_PORT` | `8080` (of een vrije poort) |
   | `NOTES_DATA` | `/mnt/user/appdata/notes/data` |
   | `NOTES_UPLOADS` | `/mnt/user/appdata/notes/uploads` |
6. **Deploy the stack**

App is bereikbaar op `http://UNRAID_IP:8080`.

### Updaten

```bash
docker compose pull && docker compose up -d
```

Portainer: *Stacks* → je stack → *Pull and redeploy*

---

## Lokale ontwikkeling

Backend:

```bash
cd backend && npm install
node --watch src/index.js   # :4000
```

Frontend:

```bash
cd frontend && npm install
npm run dev   # :5173, proxiet /api en /uploads naar :4000
```

Lokaal bouwen met Docker:

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up --build
```

> **Node versie:** gebruik Node 20. `better-sqlite3` compileert een native binding die niet werkt op Node 26+.

---

## Hoe het werkt

- **Inloggen** — vul een weergavenaam in. Geen wachtwoord, geen e-mail. Meerdere lokale profielen worden ondersteund.
- **Dashboard** — masonry kaartgrid (4 kolommen op desktop) met infinite scroll.
- **Notitieeditor** — rich text (bold, italic, lijsten, koppen, code, links) via Tiptap. Afbeeldingen plakken, slepen of uploaden (PNG/JPG/GIF/WEBP).
- **Taken** — checklijst-modus met voortgangsbalk en optionele einddatum.
- **Zoeken & filteren** — zoekt in titel, inhoud, tags en categorieën. Sidebar combineert meerdere filters.
- **Back-up/herstel** — exporteert een ZIP met de SQLite database en alle afbeeldingen. Importeren vervangt alle data en herstart de backend.

---

## Project structuur

```
.github/workflows/docker-publish.yml   CI/CD: bouw images → push naar GHCR
backend/                               Express API + SQLite (eigen Dockerfile)
frontend/                              React app via nginx in productie (eigen Dockerfile)
docker-compose.yml                     Productie/Unraid (trekt images van GHCR)
docker-compose.build.yml               Override voor lokaal bouwen vanuit broncode
.env.example                           Configuratietemplate
```
