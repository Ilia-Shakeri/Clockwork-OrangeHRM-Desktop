# Clockwork OrangeHRM Desktop

Windows-first Electron desktop app for OrangeHRM attendance reporting.

## Stack

- Electron (secure preload bridge, context isolation)
- React + TypeScript + Vite + Tailwind
- Express API hosted in Electron main process (127.0.0.1, dynamic port)
- MySQL (`mysql2`)
- Local persistence (`electron-store`)
- PDF/CSV export (`pdfkit`)
- Optional Python enhancement module (`python/generate_report_summary.py`)

## Install

```bash
npm install
```

## Run (Development)

```bash
npm run dev
```

This runs:

- Vite renderer on `http://127.0.0.1:5317`
- Electron TypeScript watch build
- Electron with auto-restart on main/preload changes

## Build

```bash
npm run build
```

Build pipeline:

1. Typecheck renderer + Electron code
2. Build renderer to `dist/`
3. Build Electron main/preload/backend to `dist-electron/`

Installer packaging (only when you are ready):

```bash
npm run build:installer
```

## Output

- Build artifacts: `dist/` and `dist-electron/`
- Installer artifacts (after `npm run build:installer`): `release/`

## Notes

- Local API is bound to `127.0.0.1` only.
- Database credentials and app settings persist in `electron-store` under app user data.
- Python enhancements are optional and auto-disabled when Python runtime is missing.

