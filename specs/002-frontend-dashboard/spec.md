# Feature Spec: Frontend Dashboard

## Overview
A React single-page application (SPA) built with Vite that serves as the user-facing dashboard for the Pinterest Automation Platform. It consumes the existing backend REST API (`/api/*`) to provide authentication, project management, and job management through a modern, responsive UI.

## User Stories

### US-1: Authentication UI (P1 — MVP)
**As a** new or returning user,
**I want** to register and log in through a web interface,
**So that** I can access the platform without using API tools like cURL or Postman.

**Acceptance Criteria:**
- [ ] Registration form with email and password fields (password min 8 chars)
- [ ] Login form with email and password fields
- [ ] Form validation with inline error messages
- [ ] On successful login, JWT token stored securely and user redirected to dashboard
- [ ] On failed login/register, display server error message
- [ ] Logged-in users redirected away from auth pages
- [ ] Logout button that clears token and redirects to login

### US-2: Project Management Dashboard (P1 — MVP)
**As an** authenticated user,
**I want** to manage my WordPress projects through a dashboard,
**So that** I can create, view, edit, and delete project configurations visually.

**Acceptance Criteria:**
- [ ] Dashboard page lists all user projects as cards/table
- [ ] "New Project" button opens a creation form
- [ ] Create project form: name, WordPress API URL, username, app password
- [ ] Project detail view showing project info (password hidden)
- [ ] Edit project form pre-filled with current values
- [ ] Delete project with confirmation dialog
- [ ] Empty state when user has no projects

### US-3: Job Management (P2)
**As an** authenticated user,
**I want** to view and manage automation jobs within a project,
**So that** I can track and create automation tasks.

**Acceptance Criteria:**
- [ ] Project detail page shows list of jobs
- [ ] "New Job" button with type and optional description fields
- [ ] Job status displayed with visual indicator (pending/running/completed/failed)
- [ ] Delete job with confirmation
- [ ] Empty state when project has no jobs

## Non-Functional Requirements
- **Performance:** Initial page load under 3 seconds; route transitions under 300ms
- **Responsive:** Works on desktop (1024px+) and tablet (768px+)
- **Security:** JWT stored in memory (React state/context), not localStorage; API calls via httpOnly patterns where possible
- **Accessibility:** Semantic HTML, keyboard navigable forms, sufficient color contrast
- **Developer Experience:** Hot module replacement via Vite, clear component structure

## Out of Scope
- Mobile-optimized layout (tablet minimum)
- Dark mode
- Real-time updates / WebSockets
- Pinterest, OpenRouter, Google Slides integrations
- Content generation UI
- User profile/settings page
