# Tasks: Frontend Dashboard

## Phase 1 — Project Setup
- [ ] **T001** — Scaffold Vite + React app in `client/` directory
- [ ] **T002** — Install and configure Tailwind CSS
- [ ] **T003** — Configure Vite proxy to forward `/api` to backend
- [ ] **T004** — Create Axios API client with interceptors

## Phase 2 — Auth Foundation
- [ ] **T005** — Create AuthContext provider (token, user, login, logout, register)
- [ ] **T006** — Create ProtectedRoute component
- [ ] **T007** — Create Layout component (navbar with user info + logout)
- [ ] **T008** — Set up React Router with all routes in App.jsx

> **GATE — Auth UI must render and route correctly before proceeding**

## Phase 3 — Auth Pages (US-1)
- [ ] **T009** — Build LoginPage with form, validation, and error display
- [ ] **T010** — Build RegisterPage with form, validation, and error display
- [ ] **T011** — Wire auth pages to API (login → store token → redirect; register → redirect to login)
- [ ] **T012** — Add redirect logic: logged-in users away from auth pages

## Phase 4 — Project Management (US-2)
- [ ] **T013** — Build DashboardPage: fetch and display project list as cards
- [ ] **T014** — Build ProjectCard component
- [ ] **T015** — Build ProjectFormPage: create mode with form fields and validation
- [ ] **T016** — Build ProjectFormPage: edit mode (pre-fill from API, submit PUT)
- [ ] **T017** — Build ProjectDetailPage: display project info
- [ ] **T018** — Add delete project with ConfirmDialog component
- [ ] **T019** — Handle empty states (no projects message + CTA)

## Phase 5 — Job Management (US-3)
- [ ] **T020** — Add job list to ProjectDetailPage (fetch jobs for project)
- [ ] **T021** — Build JobStatusBadge component (color-coded status)
- [ ] **T022** — Add "New Job" inline form on ProjectDetailPage
- [ ] **T023** — Add delete job with confirmation
- [ ] **T024** — Handle empty state (no jobs message)

## Phase 6 — Polish
- [ ] **T025** — Add loading spinners/skeletons for API calls
- [ ] **T026** — Add toast/notification for success actions (created, updated, deleted)
- [ ] **T027** — Responsive layout adjustments (tablet breakpoint)
- [ ] **T028** — End-to-end smoke test: register → login → create project → create job → delete
