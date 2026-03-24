# Implementation Plan: Frontend Dashboard

## Technical Context
- **Framework:** React 18 with Vite 5 (fast builds, ES modules, HMR)
- **Routing:** React Router v6 (client-side SPA routing)
- **Styling:** Tailwind CSS v3 (utility-first, rapid UI development)
- **HTTP Client:** Axios (interceptors for JWT, error handling)
- **State Management:** React Context API (auth state; no Redux needed at this scale)
- **Backend:** Existing Express API at `http://localhost:3000/api`
- **Dev Port:** Vite on `http://localhost:5173` with proxy to backend

## Architecture

```
client/                         # Frontend app (separate from backend)
├── index.html                  # Vite entry HTML
├── package.json
├── vite.config.js              # Proxy /api → localhost:3000
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.jsx                # React DOM render + providers
│   ├── App.jsx                 # Router setup
│   ├── index.css               # Tailwind directives
│   ├── api/
│   │   └── client.js           # Axios instance with interceptors
│   ├── context/
│   │   └── AuthContext.jsx     # Auth state provider (token, user, login/logout)
│   ├── hooks/
│   │   └── useAuth.js          # Convenience hook for auth context
│   ├── components/
│   │   ├── Layout.jsx          # App shell (navbar, main content area)
│   │   ├── ProtectedRoute.jsx  # Redirect to login if unauthenticated
│   │   ├── ProjectCard.jsx     # Project display card
│   │   ├── JobStatusBadge.jsx  # Colored status indicator
│   │   └── ConfirmDialog.jsx   # Reusable delete confirmation modal
│   └── pages/
│       ├── LoginPage.jsx
│       ├── RegisterPage.jsx
│       ├── DashboardPage.jsx   # Project list
│       ├── ProjectDetailPage.jsx  # Single project + jobs
│       ├── ProjectFormPage.jsx    # Create/Edit project
│       └── NotFoundPage.jsx
```

## Key Decisions

1. **Separate `client/` directory** — keeps frontend isolated from backend; independent build/deploy.
2. **Vite proxy** — during dev, `/api` requests proxied to Express backend. In production, a reverse proxy (nginx) or same-origin deployment.
3. **JWT in React Context** — token lives in memory; lost on page refresh (secure default). Can add `localStorage` opt-in later if needed.
4. **Tailwind CSS** — no custom CSS framework to maintain; rapid prototyping with consistent design.
5. **No component library** — keep dependencies minimal; build simple components (cards, badges, dialogs).

## API Integration

All API calls go through a configured Axios instance:
- Base URL: `/api` (proxied by Vite dev server)
- Request interceptor: Attaches `Authorization: Bearer <token>` header
- Response interceptor: On 401, clears auth state and redirects to login

## Route Map

| Path | Component | Auth Required |
|------|-----------|---------------|
| `/login` | LoginPage | No (redirect if logged in) |
| `/register` | RegisterPage | No (redirect if logged in) |
| `/` | DashboardPage | Yes |
| `/projects/new` | ProjectFormPage | Yes |
| `/projects/:id` | ProjectDetailPage | Yes |
| `/projects/:id/edit` | ProjectFormPage | Yes |
| `*` | NotFoundPage | No |

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Token lost on refresh | Accept for MVP; add refresh-token flow later |
| CORS issues in dev | Vite proxy eliminates CORS; production uses same-origin |
| Tailwind bundle size | PurgeCSS built into Tailwind v3 production build |
