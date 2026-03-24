# Feature Spec: Service Integrations & Automation Pipeline

## Overview
Extend the platform with external service integrations, per-project Google Sheet ingestion, and an automated scheduler that processes recipes on configurable intervals. This turns the platform from a manual project manager into a full content-automation pipeline.

## Architecture Scope

```
┌───────────────────────────────────────────────────────────┐
│  USER SETTINGS (global)                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │ TTAPI Key   │  │ Content API  │  │ Pin Generator │   │
│  │ (Midjourney)│  │  Key + URL   │  │   URL + Key   │   │
│  └─────────────┘  └──────────────┘  └───────────────┘   │
└───────────────────────────────────────────────────────────┘
         │                   │                  │
         ▼                   ▼                  ▼
┌───────────────────────────────────────────────────────────┐
│  PROJECT SETTINGS (per-project / per-website)           │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │ WP Categor- │  │  Pinterest   │  │ Google Sheet  │   │
│  │ ies (fetch) │  │ Boards(fetch)│  │  URL + data   │   │
│  └─────────────┘  └──────────────┘  └───────────────┘   │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Trigger Interval: 3h | 5h | 6h | 8h | 12h        │   │
│  └────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Categories string for Content API                  │   │
│  │ Authors string for Content API                     │   │
│  └────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
         │
         ▼
┌───────────────────────────────────────────────────────────┐
│  AUTOMATION PIPELINE (per trigger)                      │
│  1. Pick next unprocessed Recipe row from sheet data     │
│  2. POST /api/generate-recipe → Content Writer API      │
│  3. POST /midjourney/v1/imagine → TTAPI (image gen)     │
│  4. Poll both until done                                │
│  5. Save result as Job with article + image data        │
└───────────────────────────────────────────────────────────┘
```

---

## User Stories

### US-1: Global Service Settings (P1 — MVP)
**As a** platform user,
**I want** to configure my external API keys once,
**So that** all my projects can use TTAPI, Content Writer, and Pin Generator services.

**Acceptance Criteria:**
- [ ] Settings page accessible from the navbar
- [ ] Form fields for: TTAPI API key, Content Writer API URL + key, Pin Generator URL + key
- [ ] Keys stored encrypted at rest (same AES-256-GCM as WP passwords)
- [ ] "Test Connection" button for each service (optional, P2)
- [ ] Settings persisted per-user (not per-project)

### US-2: Project Service Configuration (P1 — MVP)
**As a** project owner,
**I want** to configure WordPress categories, Pinterest boards, Google Sheet URL, trigger interval, and Content API categories/authors strings per-project,
**So that** each website has its own automation source and schedule.

**Acceptance Criteria:**
- [ ] "Fetch Categories" button — calls `{wp_site}/wp-json/wp/v2/categories` using project WP credentials, stores result as JSON
- [ ] "Fetch Boards" button — calls `{wp_site}/wp-json/pinboards/v1/boards` using project WP credentials, stores result as JSON
- [ ] Google Sheet URL field (public sheet or sheet ID)
- [ ] Trigger interval dropdown: 3h, 5h, 6h, 8h, 12h, or disabled
- [ ] Categories string field (for Content Writer API): `Name (id) Name2 (id2)...`
- [ ] Authors string field (for Content Writer API): `Name (id) Name2 (id2)...`
- [ ] All stored in expanded Project model

### US-3: Google Sheet Ingestion (P1 — MVP)
**As a** project owner,
**I want** recipe data from my Google Sheet auto-ingested into my project,
**So that** new rows become available for automated processing.

**Acceptance Criteria:**
- [ ] Sheet read via Google Sheets public CSV export URL (no OAuth needed for public sheets)
- [ ] Expected columns: `title`, `image1`, `image2`, `featuredImage` (minimum: `title`)
- [ ] "Sync Sheet" button to manually trigger ingestion
- [ ] Ingested rows stored as `Recipe` records linked to project
- [ ] Duplicate detection (by title) — skip already-ingested rows
- [ ] Status tracking: `new` → `processing` → `completed` / `failed`

### US-4: Automated Trigger/Scheduler (P2)
**As a** project owner,
**I want** a background scheduler that processes recipes at my configured interval,
**So that** content is generated automatically without manual intervention.

**Acceptance Criteria:**
- [ ] Scheduler runs per-project at the configured interval
- [ ] Each tick: pick oldest `new` recipe → mark `processing` → call Content Writer API + TTAPI → on success mark `completed` & create Job
- [ ] On failure: mark recipe `failed`, log error, continue to next tick
- [ ] Scheduler respects enable/disable toggle
- [ ] Only processes one recipe per tick (rate-safe)

---

## New Data Models

### UserSettings (1:1 with User)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID FK | Owner |
| ttapi_api_key | TEXT (encrypted) | TTAPI.io API key |
| content_api_url | STRING(500) | Content Writer base URL |
| content_api_key | TEXT (encrypted) | Content Writer x-api-key |
| pin_generator_url | STRING(500) | Pin Generator base URL |
| pin_generator_key | TEXT (encrypted) | Pin Generator API key (if any) |

### Project (extended fields)
| Field | Type | Description |
|-------|------|-------------|
| google_sheet_url | STRING(500) | Google Sheet URL |
| trigger_interval | STRING(10) | "3h","5h","6h","8h","12h","disabled" |
| trigger_enabled | BOOLEAN | Enable/disable scheduler |
| wp_categories | TEXT (JSON) | Cached WP categories array |
| wp_pinboards | TEXT (JSON) | Cached Pinboards array |
| content_categories | TEXT | Categories string for Content API |
| content_authors | TEXT | Authors string for Content API |
| last_trigger_at | DATE | Last scheduler execution time |

### Recipe (new model)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| project_id | UUID FK | Parent project |
| title | STRING(500) | Recipe title from sheet |
| image1 | STRING(500) | Image URL 1 from sheet |
| image2 | STRING(500) | Image URL 2 from sheet |
| featured_image | STRING(500) | Featured image URL from sheet |
| status | ENUM | new, processing, completed, failed |
| error_message | TEXT | Error details if failed |
| article_job_id | STRING | Content Writer job ID |
| article_result | TEXT (JSON) | Full article result from Content Writer |
| generated_image_url | STRING(500) | TTAPI-generated image URL |
| job_id | UUID FK | Linked Job record when completed |

---

## Out of Scope
- OAuth-based Google Sheets access (use public sheet CSV export)
- Real-time WebSocket updates for processing status
- Editing recipe data after ingestion
- WordPress publishing (future feature)
- Pinterest pin auto-publishing (future feature)
