# BookLeaf Frontend

React single-page application for the BookLeaf Author Support & Communication Portal. It provides separate author and administrator experiences, sharing authentication, API client, and layout infrastructure.

## Purpose and Architecture

The frontend is a **Vite + React** SPA organized by feature domains under `src/features/`. Global concerns live in `src/lib/` (API client, CSRF, React Query), `src/routes/` (guards), and `src/layouts/` (author, admin, and public shells).

```
Browser (localhost:3000)
    │
    ▼
Vite dev server ──proxy /api──► Backend (localhost:5000)
    │
    ▼
React app
  ├── AuthProvider (session from HttpOnly cookie)
  ├── QueryClientProvider (TanStack React Query)
  └── React Router (role-based routes)
```

In local development, API requests use the relative base path `/api/v1`. Vite forwards `/api` to the backend so cookies remain same-origin.

## Technology Stack

| Category | Package |
|----------|---------|
| UI | React 19, React DOM 19 |
| Routing | React Router 7 |
| Data fetching | TanStack React Query 5, Axios |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Build | Vite 8, `@vitejs/plugin-react` |
| Testing | Vitest 4, Testing Library, jsdom |
| Linting | oxlint |

## Prerequisites

- **Node.js 20+**
- **npm**
- Running BookLeaf backend (see [../backend/README.md](../backend/README.md))
- MongoDB seeded with at least one author and admin account for sign-in

## Installation

From the `frontend/` directory:

```bash
npm install
cp .env.example .env
```

If peer dependency conflicts occur:

```bash
npm install --legacy-peer-deps
```

## Environment Variables

Only **`VITE_`-prefixed** variables are exposed to the browser. Do not put database credentials, JWT secrets, or AI keys here.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | `/api/v1` | Backend API base path or full URL |

The application reads this in `src/lib/config.js`:

```javascript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
```

### Example `.env` (local development)

Create `frontend/.env`:

```env
# Uses Vite proxy — requests to /api/v1 on port 3000 are forwarded to localhost:5000
VITE_API_BASE_URL=/api/v1
```

### Production build example

```env
VITE_API_BASE_URL=https://api.example.com/api/v1
```

Set this **before** `npm run build`. The value is baked into the bundle at build time.

### Backend alignment

In `backend/.env`, set:

```env
CLIENT_URL=http://localhost:3000
```

If you change the Vite port in `vite.config.js`, update `CLIENT_URL` to match.

## Configuring the Backend API URL

| Environment | Recommended `VITE_API_BASE_URL` |
|-------------|--------------------------------|
| Local dev (default) | `/api/v1` — uses Vite proxy in `vite.config.js` |
| Production | Full API origin, e.g. `https://api.example.com/api/v1` |

Proxy configuration (development only):

```javascript
// vite.config.js
server: {
  port: 3000,
  proxy: {
    '/api': { target: 'http://localhost:5000', changeOrigin: true },
  },
},
```

## Development Server

1. Start MongoDB and the backend on port **5000**.
2. Ensure `CLIENT_URL=http://localhost:3000` in `backend/.env`.
3. From `frontend/`:

```bash
npm run dev
```

Opens **http://localhost:3000**.

## Production Build

```bash
npm run build    # Output in dist/
npm run preview  # Preview the production build locally
```

## Lint

```bash
npm run lint
```

Uses **oxlint**. Verified to run successfully (may report warnings without failing).

## Tests

| Command | Description |
|---------|-------------|
| `npm test` | Run Vitest once (`vitest run`) |
| `npm run test:watch` | Vitest in watch mode |

**Verified:** 166 tests passed across 44 test files.

Tests use jsdom with setup in `src/test/setup.js`. React Query and routing are wrapped via helpers in `src/test/helpers.jsx`.

Configuration lives in `vite.config.js` under the `test` key.

## Route Structure

| Route | Role | Purpose |
|-------|------|---------|
| `/` | Public | Redirects to `/login` |
| `/login` | Public | Email/password sign-in |
| `/author` | AUTHOR | Dashboard with royalty summaries |
| `/author/books` | AUTHOR | Paginated book catalogue |
| `/author/tickets` | AUTHOR | Support ticket list |
| `/author/tickets/new` | AUTHOR | Create support ticket (optional attachment) |
| `/author/tickets/:ticketId` | AUTHOR | Ticket detail and conversation |
| `/author/account` | AUTHOR | Signed-in author session details |
| `/admin` | ADMIN | Overview dashboard with queue counts |
| `/admin/tickets` | ADMIN | Ticket queue with filters |
| `/admin/tickets/:ticketId` | ADMIN | Ticket detail, AI review, internal notes |
| `/admin/authors` | ADMIN | Author directory |
| `/admin/authors/:authorUserId` | ADMIN | Author support context |
| `/admin/account` | ADMIN | Signed-in admin session details |
| `*` | Any | Not found |

Route definitions: `src/app/router.jsx`. Access is enforced by `ProtectedRoute` (authenticated) and `RoleRoute` (role check).

## Authentication and Session Handling

The frontend uses **cookie-based sessions** managed by the backend. No JWT is stored in `localStorage`.

### Flow

1. On load, `AuthProvider` calls `GET /api/v1/auth/me` to restore the session.
2. Before login/logout, the API client fetches `GET /api/v1/auth/csrf-token`.
3. `POST /api/v1/auth/login` sends credentials with the CSRF header; the backend sets an HttpOnly cookie.
4. All API requests use `withCredentials: true` (Axios) so cookies are sent.
5. On 401 (except `/auth/me` and `/auth/login`), the client clears the CSRF cache.
6. After login, users are redirected to `/admin` or `/author` based on role.

### Auth endpoints used

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/auth/csrf-token` | CSRF token for mutating requests |
| `POST` | `/auth/login` | Sign in |
| `GET` | `/auth/me` | Current user profile |
| `POST` | `/auth/logout` | Invalidate session |

Author self-registration (`POST /auth/register`) exists on the backend but is **not** exposed in the UI. New authors are provisioned via database seed or invitation tokens.

Key files: `src/features/auth/context/AuthContext.jsx`, `src/lib/apiClient.js`, `src/lib/csrf.js`.

## API Client and React Query

### API client (`src/lib/apiClient.js`)

- Axios instance with `baseURL` from `VITE_API_BASE_URL`
- 15-second request timeout
- Automatic CSRF header injection for `POST`, `PUT`, `PATCH`, `DELETE`
- Normalized errors via `src/lib/apiError.js`

### React Query (`src/lib/queryClient.js`)

Default query options:

- `staleTime`: 60 seconds
- `refetchOnWindowFocus`: enabled in production only
- Retries: skipped for 401/403; limited retry for network errors

Feature hooks wrap domain APIs, for example:

- `src/features/tickets/hooks/useTickets.js` — author tickets; polls conversation every **5 seconds** on detail pages when the tab is visible
- `src/features/admin/hooks/useAdminTickets.js` — admin queue and ticket detail; polls messages and AI status every **5 seconds** when active

There is **no WebSocket** layer; live updates use polling.

### Connecting to the backend

1. Backend must listen on port **5000** (or update the Vite proxy target).
2. `CLIENT_URL` on the backend must match `http://localhost:3000`.
3. Use the default `VITE_API_BASE_URL=/api/v1` so the proxy handles cross-origin cookies in development.

## Feature Notes

### Author portal

- Dashboard summaries are computed client-side from `GET /api/v1/books` (no dedicated dashboard endpoint).
- Book search uses the backend title filter.
- Ticket creation supports an optional attachment (PDF, PNG, JPG, GIF, TXT; max 5 MB).
- Profile editing is not available; account details come from `GET /auth/me` (see `src/features/author/constants/apiGaps.js`).

### Admin portal

- Dashboard counts use server-side `pagination.total` from filtered queue queries.
- Assignee dropdown is limited to the signed-in admin plus admins seen in queue results (no admin directory API).
- Author directory uses `GET /api/v1/admin/authors` and related detail endpoints.
- AI drafts require explicit admin approval before sending as a public reply.
- Internal notes use admin-only endpoints and are never mixed with public messages.
- Remaining API gaps are documented in `src/features/admin/constants/apiGaps.js`.

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm test` | Run Vitest test suite |
| `npm run test:watch` | Vitest watch mode |
| `npm run lint` | Run oxlint |

## Common Errors

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank page after login redirect | Backend not running | Start backend `npm run dev` in `backend/` |
| Network error on all API calls | Wrong API URL or CORS | Use `/api/v1` locally; verify `CLIENT_URL` |
| 403 on login | CSRF failure | Ensure requests go through Vite proxy; clear site cookies |
| 401 on protected routes | No valid session | Sign in with seeded credentials |
| Production build cannot reach API | Relative `/api/v1` without proxy | Set full `VITE_API_BASE_URL` before build |
| Attachment upload rejected | Type/size limits | Max 5 MB; allowed types listed in create-ticket form |

## Demo Sign-In (after backend seed)

Use credentials from your `backend/.env` seed configuration. Local demo defaults (when seed creates new accounts):

| Role | Example email | Password |
|------|---------------|----------|
| Author | `priya.sharma@email.com` | `Author@123` |
| Admin | Your `ADMIN_EMAIL` value | Your `ADMIN_PASSWORD` value (local demo: `admin`) |

## Related Documentation

- [Project README](../README.md) — full-stack setup, seeding, and troubleshooting
- [Backend README](../backend/README.md) — API, auth, AI, attachments
- [API documentation](../backend/docs/api/README.md) — Swagger and OpenAPI
