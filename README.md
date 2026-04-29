# PWA API Lab

React + TypeScript test app for checking Progressive Web App capability support across mobile and desktop browsers.

## What it covers

- install prompt and display mode
- service worker and cache availability
- notifications, badging, and push support detection
- background sync and periodic sync support
- storage quota and persistent storage requests
- Web Share, Launch Queue, File System Access, vibration, wake lock, and orientation lock

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## GitHub Pages deployment

The repository includes:

- `.github/workflows/ci.yml` for lint + build validation
- `.github/workflows/pages.yml` for GitHub Pages deployment from Actions

The Pages workflow automatically sets `VITE_BASE_PATH` to the repository name so the app can be published at:

`https://cmwen.github.io/pwa-api-lab/`
