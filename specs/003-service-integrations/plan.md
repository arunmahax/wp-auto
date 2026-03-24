# Implementation Plan: Service Integrations & Automation Pipeline

## Technical Context
- **Existing stack:** Node.js + Express + Sequelize (SQLite dev / PostgreSQL prod)
- **Frontend:** React + Vite + Tailwind in `client/`
- **Auth:** JWT in memory, AES-256-GCM for secrets at rest
- **New dependencies:** `node-cron` (scheduler), `csv-parse` (sheet CSV parsing)

## Architecture

### Backend Additions

```
src/
├── models/
│   ├── UserSettings.js          # Global API key storage (1:1 User)
│   └── Recipe.js                # Ingested sheet rows
├── services/
│   ├── settingsService.js       # CRUD for UserSettings
│   ├── wpFetchService.js        # Fetch WP categories + pinboards
│   ├── sheetService.js          # Google Sheet CSV ingestion
│   ├── contentWriterClient.js   # HTTP client for Content Writer API
│   ├── ttapiClient.js           # HTTP client for TTAPI Midjourney
│   ├── pinGeneratorClient.js    # HTTP client for Pin Generator
│   └── scheduler.js             # node-cron per-project triggers
├── controllers/
│   ├── settingsController.js    # User settings endpoints
│   ├── wpFetchController.js     # Fetch categories/boards
│   ├── sheetController.js       # Sheet sync endpoint
│   └── recipeController.js      # Recipe list/status
├── routes/
│   ├── settings.js              # /api/settings/*
│   └── recipes.js               # /api/projects/:id/recipes
└── validators/
    ├── settingsValidator.js
    └── recipeValidator.js
```

### Frontend Additions

```
client/src/
├── pages/
│   ├── SettingsPage.jsx         # Global API key configuration
│   └── ProjectSettingsPage.jsx  # Per-project service config
└── components/
    ├── RecipeTable.jsx          # Ingested recipes list
    └── ServiceStatus.jsx        # Connection status indicator
```

## Key Decisions

1. **Google Sheet via public CSV** — No OAuth complexity. Sheet must be published to web. URL format: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}`. This keeps the ingestion simple and dependency-free.

2. **node-cron for scheduling** — Lightweight, runs inside the Express process. Each project's interval is registered as a cron job on server startup. When trigger settings change, job is re-registered.

3. **Encrypted API keys** — Reuse existing AES-256-GCM encryption service for all secrets (TTAPI key, Content API key, Pin Generator key).

4. **Recipe as separate model** — Not reusing Job. Recipe represents an ingested row from the sheet with its processing lifecycle. When completed, it creates a Job record for traceability.

5. **WP credentials reuse** — Fetching categories and pinboards uses the same WP URL + username + app_password already stored in the Project model. No additional credentials needed.

## API Endpoints

### User Settings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | Get current user's settings (keys masked) |
| PUT | `/api/settings` | Create/update user settings |

### Project Config (extended)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/projects/:id/fetch-categories` | Fetch & cache WP categories |
| POST | `/api/projects/:id/fetch-boards` | Fetch & cache Pinboards |
| POST | `/api/projects/:id/sync-sheet` | Ingest Google Sheet data |
| GET | `/api/projects/:id/recipes` | List ingested recipes |
| GET | `/api/projects/:id/recipes/:recipeId` | Get recipe detail + result |

### Project model update
PUT `/api/projects/:id` extended with new fields: `google_sheet_url`, `trigger_interval`, `trigger_enabled`, `content_categories`, `content_authors`.

## External API Integration

### Content Writer API
- Base: configurable (default `http://75.119.157.40:3090`)
- Auth: `x-api-key` header
- Flow: POST `/api/generate-recipe` → poll `/api/job-status/{id}` → GET `/api/job-result/{id}`
- Poll every 5s, timeout after 120s

### TTAPI (Midjourney)
- Base: `https://api.ttapi.io`
- Auth: `x-api-key` header
- Flow: POST `/midjourney/v1/imagine` with prompt → poll for result
- Image prompt: describe the food based on recipe title + "food photography, high quality"

### Pin Generator
- Base: configurable (user setting)
- Auth: optional API key
- Flow: POST `/api/create-pin` with images + title → get pin image URL

### Google Sheets
- Public CSV export: `https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid={GID}`
- Parse CSV, extract columns: title, image1, image2, featuredImage
- No auth required (sheet must be public)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Sheet not public | Clear UI guidance + error message on fetch failure |
| TTAPI rate limits | One recipe per trigger tick, configurable interval |
| Content API slow (30-60s) | Async polling, recipe marked "processing" |
| Server restart loses cron jobs | Re-register all active triggers on startup |
| Multiple server instances | Accept for MVP (single instance); future: use external queue |
