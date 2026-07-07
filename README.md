# AI Training Plan MVP

Frontend-only product MVP for AI Training Plan. This is the actual app surface, not the outreach website.

## Features

- Athlete dashboard with readiness, load, risk, race score, and AI coaching note
- Editable weekly plan with workout creation and status cycling
- Recovery cockpit with HRV, sleep, soreness, and readiness charts
- AI-style insights generated from local demo data
- Data source toggles for Strava, Apple Health, and Fitbit
- JSON export/import and browser localStorage persistence
- Light mode by default with a dark mode toggle
- GitHub Pages deployment workflow

## Local Development

```bash
npm install
npm run dev
npm run build
npm run preview
```

## GitHub Pages

The app is configured for a repository named `ai-training-plan-mvp`:

```ts
base: '/ai-training-plan-mvp/'
```

After pushing to GitHub, enable Pages from repository Settings, choose GitHub Actions as the source, and push to `main`.
