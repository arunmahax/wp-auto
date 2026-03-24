# Tasks: Backend Foundation

**Input**: Design documents from `specs/001-backend-foundation/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan (src/config/, src/middleware/, src/models/, src/routes/, src/services/, src/controllers/, src/validators/)
- [ ] T002 Initialize Node.js project with package.json and install dependencies (express, sequelize, pg, pg-hstore, jsonwebtoken, bcryptjs, joi, helmet, cors, dotenv, uuid)
- [ ] T003 [P] Create environment config file .env.example with PORT, DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, NODE_ENV
- [ ] T004 [P] Create src/app.js with Express setup (helmet, cors, JSON parsing, route mounting, error handler)
- [ ] T005 Create server.js entry point that loads .env and starts the Express app

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create src/config/database.js with Sequelize configuration (PostgreSQL prod, SQLite dev based on NODE_ENV)
- [ ] T007 Create src/models/index.js with Sequelize initialization, model imports, and association setup
- [ ] T008 [P] Create src/middleware/errorHandler.js with centralized error handling middleware (validation errors, auth errors, generic errors)
- [ ] T009 [P] Create src/middleware/validate.js with Joi validation middleware factory
- [ ] T010 [P] Create src/services/encryption.js with AES-256-GCM encrypt/decrypt functions using Node.js crypto module
- [ ] T011 Create src/routes/index.js route aggregator that mounts auth, projects, and jobs routes

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - User Registration and Login (Priority: P1) 🎯 MVP

**Goal**: Users can register with email/password and log in to receive a JWT token

**Independent Test**: Register a new user via POST /api/auth/register, then login via POST /api/auth/login and verify a JWT token is returned

### Implementation for User Story 1

- [ ] T012 [US1] Create src/models/User.js with Sequelize model (id UUID, email unique, password hashed, timestamps)
- [ ] T013 [US1] Create src/validators/authValidator.js with Joi schemas for register (email, password min 8) and login
- [ ] T014 [US1] Create src/services/authService.js with register (hash password, create user) and login (verify password, sign JWT) methods
- [ ] T015 [US1] Create src/middleware/auth.js with JWT verification middleware that extracts user from token
- [ ] T016 [US1] Create src/controllers/authController.js with register and login request handlers
- [ ] T017 [US1] Create src/routes/auth.js with POST /register and POST /login routes wired to controller and validators

**Checkpoint**: At this point, User Story 1 should be fully functional — users can register and login

---

## Phase 4: User Story 2 - Project Management (Priority: P2)

**Goal**: Authenticated users can create, list, view, update, and delete WordPress site projects

**Independent Test**: Create a project via POST /api/projects with WordPress credentials, list via GET /api/projects, update via PUT /api/projects/:id, delete via DELETE /api/projects/:id. Verify ownership enforcement.

### Implementation for User Story 2

- [ ] T018 [US2] Create src/models/Project.js with Sequelize model (id UUID, user_id FK, name, wp_api_url, wp_username, wp_app_password encrypted, timestamps)
- [ ] T019 [US2] Create src/validators/projectValidator.js with Joi schemas for create/update project
- [ ] T020 [US2] Create src/services/projectService.js with CRUD methods (create with encryption, find by user, find by id with ownership check, update, delete)
- [ ] T021 [US2] Create src/controllers/projectController.js with create, list, getById, update, delete handlers
- [ ] T022 [US2] Create src/routes/projects.js with CRUD routes (all protected by auth middleware), wired to controllers and validators

**Checkpoint**: At this point, User Stories 1 AND 2 should both work — users can register, login, and manage projects

---

## Phase 5: User Story 3 - Automation Job Placeholder (Priority: P3)

**Goal**: Users can create, list, view, and delete automation job records within their projects

**Independent Test**: Create a job via POST /api/projects/:projectId/jobs, list via GET, verify status defaults to "pending". Verify ownership enforcement through project.

### Implementation for User Story 3

- [ ] T023 [US3] Create src/models/Job.js with Sequelize model (id UUID, project_id FK, type, description, status enum, timestamps)
- [ ] T024 [US3] Update src/models/index.js to register Job model and define Project→Job association
- [ ] T025 [US3] Create src/validators/jobValidator.js with Joi schemas for create job
- [ ] T026 [US3] Create src/services/jobService.js with create, listByProject, getById, delete methods (with project ownership verification)
- [ ] T027 [US3] Create src/controllers/jobController.js with create, list, getById, delete handlers
- [ ] T028 [US3] Create src/routes/jobs.js with CRUD routes nested under /projects/:projectId/jobs, protected by auth middleware

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T029 [P] Create .gitignore (node_modules, .env, *.sqlite)
- [ ] T030 [P] Add npm scripts to package.json (start, dev with nodemon if desired)
- [ ] T031 Verify all routes return correct HTTP status codes per contracts (201, 200, 400, 401, 403, 404, 409)
- [ ] T032 Run quickstart.md validation — manually test the full flow end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 (Auth) should be done first since US2/US3 depend on auth middleware
  - US2 (Projects) should be done before US3 (Jobs depend on projects)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 (needs auth middleware from T015)
- **User Story 3 (P3)**: Depends on US2 (jobs belong to projects, needs Project model from T018)

### Within Each User Story

- Models before services
- Services before controllers
- Controllers before routes
- Validators can be parallel with models

### Parallel Opportunities

- T003, T004 can run in parallel (different files, Phase 1)
- T008, T009, T010 can run in parallel (different files, Phase 2)
- T029, T030 can run in parallel (Phase 6)
- Within US1: T013 (validator) can be parallel with T012 (model)
- Within US2: T019 (validator) can be parallel with T018 (model)
- Within US3: T025 (validator) can be parallel with T023 (model)

---

## Summary

| Metric                     | Value |
| -------------------------- | ----- |
| Total tasks                | 32    |
| Phase 1 (Setup)            | 5     |
| Phase 2 (Foundational)     | 6     |
| Phase 3 (US1 - Auth)       | 6     |
| Phase 4 (US2 - Projects)   | 5     |
| Phase 5 (US3 - Jobs)       | 6     |
| Phase 6 (Polish)           | 4     |
| Parallel opportunities     | 10    |
| MVP scope                  | US1 (Tasks T012-T017) |

### Implementation Strategy

1. **MVP First**: Complete Phase 1 → Phase 2 → Phase 3 (US1). At this point you have a working auth system.
2. **Incremental**: Add US2 (projects), then US3 (jobs). Each phase is independently testable.
3. **Polish last**: Clean up, verify contracts, run end-to-end tests.
