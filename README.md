# Clockwork OrangeHRM Desktop

Desktop attendance reporting and export tool for OrangeHRM, built with Electron and React.

## Features
- Secure desktop app shell with custom window controls
- Local embedded API for settings, user lookup, reporting, exports, and live presence
- Multi-database connectivity with engine adapters:
  - MariaDB (default)
  - MySQL
  - PostgreSQL
  - SQLite (file-based)
- Attendance reports with preset/custom date ranges (including payroll-cycle 26-25)
- Solar and Gregorian date display support
- Bulk username scan and batch report execution
- Export history tracking with CSV/PDF output
- Optional Python-based report summary integration
- Live Presence page with polling and manual refresh

## Tech Stack
- Electron
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Express (embedded local API)
- `mysql2` (MariaDB/MySQL)
- `pg` (PostgreSQL)
- `node:sqlite` (SQLite, built into Node.js runtime)
- `electron-store`
- `zod`
- `pdfkit`
- `date-fns-jalali`

## Prerequisites
- Node.js 22.x (recommended to match CI)
- npm 10+
- Windows (primary target)
- Access to an OrangeHRM-compatible database (MariaDB/MySQL/PostgreSQL)
- Python (optional, only for summary generation)

## Installation
```bash
git clone https://github.com/Ilia-Shakeri/Clockwork-OrangeHRM-Desktop.git
cd Clockwork-OrangeHRM-Desktop
npm install
```

## Configuration
### Environment variables
Copy `.env.example` to `.env` and adjust if needed.

```bash
cp .env.example .env
```

Available values:
- `NODE_ENV`: runtime mode
- `VITE_DEV_SERVER_URL`: renderer dev server URL
- `DB_ENGINE`: `mariadb` | `mysql` | `postgres` | `sqlite` (default: `mariadb`)
- `DB_HOST`: database host (default `127.0.0.1`)
- `DB_PORT`: database port (defaults by engine: `3306` for mariadb/mysql, `5432` for postgres)
- `DB_USER`: database username
- `DB_PASSWORD`: database password
- `DB_NAME`: database name
- `DB_SSL`: `true` or `false`
- `SQLITE_PATH`: SQLite file path (default `./data/app.db`)

The active runtime connection is managed from the app UI and persisted with `electron-store`.

### Database setup in app
1. Open **Connections** page.
2. Select **Database Engine**.
3. Fill engine-specific fields:
   - MariaDB/MySQL/PostgreSQL: host, port, user, password, database, SSL.
   - SQLite: file path.
4. Click **Test Connection and Save**.

### Database compatibility note
- OrangeHRM schemas are primarily used with MariaDB/MySQL.
- PostgreSQL and SQLite adapters are implemented with equivalent query behavior and payload normalization.
- SQLite is best for lightweight or custom deployments and may require schema alignment if your source data differs.

## Development
```bash
npm run dev
```

This starts:
- Vite renderer dev server
- Electron TypeScript watch build
- Electron process with restart-on-change

## Build and Packaging
```bash
npm run build
```

Installer build:
```bash
npm run build:installer
```

## Scripts
- `npm run dev`: run renderer + electron watchers
- `npm run dev:renderer`: start Vite dev server
- `npm run dev:electron:build`: watch-build Electron TS
- `npm run dev:electron`: run Electron against built main process
- `npm run typecheck`: TypeScript checks for renderer and Electron
- `npm run build:renderer`: production renderer build
- `npm run build:electron`: production Electron build
- `npm run build`: typecheck + renderer build + Electron build
- `npm run db:check`: compile Electron backend and run DB connectivity smoke check from current env
- `npm run build:installer`: create Windows installer
- `npm run lint`: TypeScript no-emit check for renderer project

## Architecture Overview
### Main Process (`electron/`)
- Creates and manages the BrowserWindow
- Registers IPC handlers exposed through preload
- Starts/stops local embedded API server

### Embedded API (`electron/backend/`)
- Express server bound to `127.0.0.1` on dynamic port
- Handles settings, DB connection, users, reports, presence, export, python summary
- Uses `zod` for input/output validation
- Routes all database operations through `createDbClient()` with engine adapters

### Database Layer (`electron/backend/db/`)
- `index.ts`: adapter factory + unified client
- `mysql-mariadb.ts`: MariaDB/MySQL implementation
- `postgres.ts`: PostgreSQL implementation
- `sqlite.ts`: SQLite implementation
- `query-builders/dialect.ts`: SQL dialect helpers for date/time/concat/like/pagination

### Renderer (`src/`)
- React app rendered through hash router
- Pages consume API through `src/api/client.ts`
- Theme and date/calendar behavior driven by settings

### Data Flow
1. Renderer sends API request via `apiClient`.
2. Request goes to local Express API in Electron main process.
3. Backend validates input, executes DB adapter queries, and returns normalized payloads.
4. Renderer displays results and supports export/save flows via preload IPC.

## Troubleshooting (Windows)
- If `npm ci` or `npm install` fails, remove `node_modules` and retry.
- If Electron does not start in dev mode, ensure port `5317` is available.
- If database calls fail, re-check selected engine and credentials from **Connections**.
- For PostgreSQL SSL environments, set `DB_SSL=true` (or toggle SSL in Connections).
- If SQLite fails to open, verify the configured path and folder permissions.
- If installer build fails, ensure build tools and permissions are available.
- If Python summary is unavailable, install Python and verify PATH.

## Security Notes
- Local API binds only to `127.0.0.1`.
- Renderer accesses privileged operations only through preload IPC.
- Database credentials are stored locally in application data via `electron-store`.

## Needs Confirmation
- `CONTRIBUTING.md`: kept for maintainers; if this repository is distributed as app-only source, this file can be removed.

## License
MIT. See [LICENSE](./LICENSE).

## Author
Ilia Shakeri
