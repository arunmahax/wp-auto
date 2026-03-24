# Tasks: Service Integrations & Automation Pipeline

## Phase 1 — Data Model Changes
- [x] **T001** — Create UserSettings model (id, user_id FK, encrypted API keys)
- [x] **T002** — Create Recipe model (id, project_id FK, title, images, status, results)
- [x] **T003** — Extend Project model with new fields (sheet URL, trigger, categories JSON, boards JSON, content strings)
- [x] **T004** — Register new models + associations in models/index.js
- [x] **T005** — Install new dependencies: node-cron, csv-parse, axios (already in client)

> **GATE — All models must sync & new fields must appear in DB before proceeding** ✅

## Phase 2 — Global Settings API + UI
- [x] **T006** — Create settingsService.js (get, upsert — encrypt keys, mask on read)
- [x] **T007** — Create settingsController.js + settingsValidator.js
- [x] **T008** — Create settings routes, mount at /api/settings
- [x] **T009** — Build SettingsPage.jsx (form for TTAPI key, Content API URL+key, Pin Generator URL+key)
- [x] **T010** — Add Settings link to navbar Layout.jsx
- [x] **T011** — Wire SettingsPage to API (load, save, display masked keys)

> **GATE — User can save & retrieve settings before proceeding** ✅

## Phase 3 — Project Settings Extensions (API + UI)
- [x] **T012** — Extend projectValidator with new optional fields
- [x] **T013** — Extend projectService.create/update to handle new fields
- [x] **T014** — Create wpFetchService.js (fetchCategories, fetchBoards using project WP creds)
- [x] **T015** — Create wpFetchController.js + routes (POST fetch-categories, POST fetch-boards)
- [x] **T016** — Build ProjectSettingsPage.jsx (Google Sheet URL, trigger interval, categories/authors strings, fetch buttons, JSON display)
- [x] **T017** — Add "Settings" tab/link to ProjectDetailPage
- [x] **T018** — Wire fetch-categories + fetch-boards buttons to API, display results

> **GATE — Project settings save correctly, WP fetch returns real data** ✅

## Phase 4 — Google Sheet Ingestion
- [x] **T019** — Create sheetService.js (download CSV, parse, dedupe, bulk-create Recipe rows)
- [x] **T020** — Create sheetController.js + route (POST /api/projects/:id/sync-sheet)
- [x] **T021** — Create recipeController.js + routes (GET /api/projects/:id/recipes)
- [x] **T022** — Build RecipeTable component + add to ProjectSettingsPage (list with status badges)
- [x] **T023** — Wire "Sync Sheet" button on ProjectSettingsPage to API

> **GATE — Sheet data appears as Recipe rows in project detail** ✅

## Phase 5 — External Service Clients
- [x] **T024** — Create contentWriterClient.js (submitJob, pollStatus, getResult)
- [x] **T025** — Create ttapiClient.js (submitImagine, pollResult)
- [x] **T026** — Create pinGeneratorClient.js (createPin)

## Phase 6 — Scheduler / Trigger Engine
- [x] **T027** — Create scheduler.js (registerProject, unregisterProject, processNextRecipe)
- [x] **T028** — processNextRecipe: pick oldest "new" recipe → call contentWriterClient + ttapiClient → save results
- [x] **T029** — On server startup, load all projects with trigger_enabled=true and register cron jobs
- [x] **T030** — On project update (trigger change), re-register cron job
- [x] **T031** — Add scheduler status indicator to ProjectSettingsPage (last run, enabled, interval)

## Phase 7 — Polish & Testing
- [x] **T032** — End-to-end verification: all modules load, frontend builds clean, models sync
- [ ] **T033** — Error handling for all external API failures (timeout, 4xx, 5xx) — handled in service clients
- [ ] **T034** — Add loading states + toast notifications for all async operations
