# BookLeaf Backend API

Express REST API for the BookLeaf Author Support & Communication Portal. It handles authentication, author book catalogues, support tickets with messaging and attachments, admin queue management, optional AI-assisted classification and draft replies, and database seeding from the assignment sample dataset.

## Purpose and Architecture

The backend follows a modular layout under `src/modules/`, with shared middleware, configuration, and route registration.

```
HTTP request
    │
    ▼
Express (app.js)
  ├── Helmet, CORS, cookie-parser, JSON body parser
  ├── /api/v1/* routes (index.js)
  │     ├── CSRF validation (mutating requests)
  │     ├── auth, books, tickets
  │     └── admin (authors, dashboard, tickets)
  ├── Swagger UI (/api-docs) — non-production only
  └── Global error handler
    │
    ▼
Mongoose models ──► MongoDB
Local disk ──► backend/storage/ticket-attachments/
Optional AI ──► OpenAI or Ollama
```

Entry point: `src/server.js` — loads config, connects MongoDB, optionally initializes AI, listens on `PORT`.

## Technology Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 20+ (ES modules) |
| Framework | Express 4 |
| Database | MongoDB via Mongoose 8 |
| Validation | Joi |
| Auth | JWT in HttpOnly cookie, bcryptjs password hashing |
| Security | Helmet, CORS, CSRF, express-rate-limit (login) |
| File uploads | Multer (local disk storage) |
| API docs | OpenAPI 3.x, swagger-ui-express |
| Testing | Jest, Supertest, mongodb-memory-server |
| AI (optional) | OpenAI (fetch + JSON schema) or Ollama |

## Prerequisites

- **Node.js 20+**
- **MongoDB 6+** (local or hosted) for running the server
- **npm**

Optional: OpenAI API key or a local Ollama instance for AI features.

## Installation

From the `backend/` directory:

```bash
npm install
cp .env.example .env
```

Edit `.env` with your local values. Do not commit `.env` to version control.

## Environment Configuration

All **required** server variables are validated at startup by `src/config/index.js`. Missing or invalid values produce clear startup errors.

### Required (server startup)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/bookleaf` |
| `CLIENT_URL` | Allowed frontend origin for CORS (no trailing slash) | `http://localhost:3000` |
| `JWT_SECRET` | JWT signing secret (min 32 characters) | `your-long-random-secret-at-least-32-chars` |

### Optional (server startup)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | HTTP port |
| `NODE_ENV` | `development` | `development`, `production`, or `test` |
| `JWT_EXPIRES_IN` | `1d` | Access token lifetime |
| `JWT_ISSUER` | `bookleaf-api` | JWT issuer claim |
| `JWT_AUDIENCE` | `bookleaf-portal` | JWT audience claim |
| `COOKIE_SAME_SITE` | `lax` | Cookie SameSite policy (`strict`, `lax`, `none`) |
| `AUTH_COOKIE_PATH` | `/` | Auth cookie path |
| `LOGIN_RATE_LIMIT_MAX` | `10` | Max login attempts per IP per 15-minute window |

### Required for `npm run seed` only

| Variable | Description |
|----------|-------------|
| `SEED_CONFIRM` | Must be exactly `yes` |
| `SEED_AUTHOR_DEFAULT_PASSWORD` | Password for **new** author accounts (min 8 characters) |
| `ADMIN_EMAIL` | Email for the seeded administrator |
| `ADMIN_PASSWORD` | Password for the seeded administrator |
| `ALLOW_PRODUCTION_SEED` | Default `false`; set `true` only for approved production seeding |

See [`.env.example`](./.env.example) for placeholder values and AI configuration comments.

### AI provider (optional)

AI ticket classification and draft generation are **optional**. Omit `AI_PROVIDER` to disable AI entirely. Ticket creation, admin replies, and manual classification continue without AI.

Set `AI_PROVIDER` to exactly one of:

| Value | Required variables |
|-------|-------------------|
| `openai` | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| `ollama` | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |

Optional: `AI_REQUEST_TIMEOUT_MS` (default `60000`).

**Provider selection rules**

- Only the selected provider is validated at startup.
- Missing credentials for the unselected provider do not block startup.
- An invalid `AI_PROVIDER` value fails startup (no silent default).
- The backend does not verify Ollama reachability at startup.
- There is **no** automatic cross-provider fallback after failures.
- Background analysis runs in-process via `setImmediate` and is not durable across restarts.
- Changing providers requires updating environment variables and restarting.

**OpenAI example**

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

**Ollama example**

```bash
ollama pull llama3.2
```

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

Automated tests mock both providers and do not call paid APIs or require Ollama.

## Database Connection and Setup

**Database:** MongoDB.

1. Start MongoDB locally or configure a hosted cluster.
2. Set `MONGODB_URI` in `.env`:

   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/bookleaf
   ```

3. Connection is established in `src/config/database.js` on server start.
4. Collections and indexes are created when models are first used. An empty database is acceptable before seeding.

**Health check:**

```bash
curl http://localhost:5000/api/v1/health
```

Returns `"database": "connected"` when MongoDB is reachable, or **503** when disconnected.

## Database Seeding

> **Warning:** Seeding modifies author, book, and admin user records in the configured database. Review safety rules below before running against any non-local database.

### Command

From `backend/`:

```bash
npm run seed
```

Runs `node scripts/seedDatabase.js` → `runSeed()` in `src/modules/seed/seed.service.js`.

### Dataset source

`docs/FULLSTACK-SAMPLEDATA (1) (1).json`

| Content | Count |
|---------|-------|
| Author profiles | 10 |
| Book records | 18 |

The JSON does not include passwords. The seed script provisions credentials from environment variables.

### What seed creates

1. **Author users** — one per `author_id` in the dataset, with bcrypt-hashed `SEED_AUTHOR_DEFAULT_PASSWORD` for **new** accounts.
2. **Book records** — upserted by `bookId`, linked to the corresponding author user.
3. **Administrator** — one user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if no admin exists at that email.

### Seed behavior

| Property | Behavior |
|----------|----------|
| Idempotent | Re-running updates profile and book fields; does **not** overwrite existing password hashes, roles, `tokenVersion`, or `isActive` |
| Non-destructive | Does **not** delete tickets, messages, audit logs, or unrelated data |
| Verification | Validates author/book counts, relationships, and royalty totals after import |
| Output | Prints created/updated counts; does **not** print credentials or password hashes |

### Local demo configuration

1. Ensure MongoDB is running and `.env` is configured.
2. Set seed variables in `.env`. For local development, the codebase defines these demo values in `src/modules/seed/constants.js`:
   - Author password: `Author@123`
   - Admin password: `admin`
3. Run `npm run seed`.

Example author sign-in after seed: `priya.sharma@email.com` / `Author@123` (when the account was created by seed with the demo author password).

### Safety rules

- `SEED_CONFIRM=yes` is required.
- Shared demo passwords are **blocked** when `NODE_ENV=production`.
- Production seeding requires `ALLOW_PRODUCTION_SEED=true` plus explicitly supplied strong credentials.
- The script refuses production-like database names (e.g. `production`) unless production seeding is explicitly enabled.
- If an existing author account lacks a password hash, the seed reports a warning and does not overwrite credentials.
- If `ADMIN_EMAIL` already belongs to a non-admin account, seeding stops with an error.

**Never use local demo passwords in production.**

### Database reset / cleanup

There is **no** verified reset script in this repository. To wipe development data:

1. Manually drop the MongoDB database (e.g. `mongosh` → `use bookleaf` → `db.dropDatabase()`), **or**
2. Point `MONGODB_URI` at a fresh database name, then run `npm run seed` again.

Dropping a database is **destructive**. Confirm you are targeting a local development database only.

## Development Server

Requires a running MongoDB instance:

```bash
npm run dev
```

Runs `node --watch src/server.js` with file watching. Default: **http://localhost:5000**.

## Production Server

```bash
npm start
```

Runs `node src/server.js` without watch mode.

When `NODE_ENV=production`:

- Swagger UI is **not** mounted.
- Non-production demo routes under `/api/v1/demo` are disabled.

## API Base URL and Health

| Resource | Path |
|----------|------|
| API prefix | `/api/v1` |
| Health | `GET /api/v1/health` |

**Success (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service is healthy",
  "data": {
    "uptime": 12.345,
    "database": "connected"
  }
}
```

**Unavailable (503)** when MongoDB is disconnected:

```json
{
  "success": false,
  "statusCode": 503,
  "message": "Service unavailable",
  "data": {
    "uptime": 12.345,
    "database": "disconnected"
  }
}
```

## Swagger / OpenAPI

When the server runs with `NODE_ENV` ≠ `production`:

| Resource | URL |
|----------|-----|
| Swagger UI | http://localhost:5000/api-docs |
| OpenAPI JSON | http://localhost:5000/api-docs/openapi.json |

Validate without starting the server:

```bash
npm run validate:openapi
```

Documentation source: `docs/api/`. See [docs/api/README.md](./docs/api/README.md).

Only implemented endpoints appear in the live OpenAPI document. Proposed endpoints are listed in [docs/api/endpoint-inventory.md](./docs/api/endpoint-inventory.md).

## Authentication and Authorization

Authentication uses an **HttpOnly cookie** (`bookleaf_access_token`) containing a signed JWT. The token is **not** returned in JSON responses.

### Roles

| Role | Description |
|------|-------------|
| `AUTHOR` | Access to books and own tickets |
| `ADMIN` | Access to admin queue, authors, internal notes, AI controls |

### CSRF protection

State-changing auth requests (`register`, `login`, `logout`) require:

1. `GET /api/v1/auth/csrf-token`
2. Send the returned token in the `x-csrf-token` header
3. Include cookies on subsequent requests (`credentials: 'include'` in browsers)

### Author registration

Authors register with a **one-time invitation token** (bcrypt hash stored server-side; raw token never persisted).

Generate an invitation locally:

```bash
node scripts/generateInvitation.js --email priya.sharma@email.com --author-id AUTH001 --name "Priya Sharma"
```

Share the printed token securely out of band. Do not commit tokens to source control.

Administrator accounts are created through seeding or internal provisioning, not public registration.

### Logout / token revocation

`POST /api/v1/auth/logout` clears the browser cookie and increments server-side `tokenVersion`. Previously issued JWTs become invalid.

### Frontend integration

Set `CLIENT_URL` to the frontend origin and send credentialed requests:

```javascript
fetch('http://localhost:5000/api/v1/auth/me', { credentials: 'include' });
```

## Main API Modules

| Module | Path prefix | Responsibility |
|--------|-------------|----------------|
| `auth` | `/api/v1/auth` | CSRF, login, logout, register, session |
| `books` | `/api/v1/books` | Author book catalogue |
| `tickets` | `/api/v1/tickets` | Author ticket CRUD, messages, attachments |
| `admin/authors` | `/api/v1/admin/authors` | Author directory, books, royalty summary |
| `admin/dashboard` | `/api/v1/admin/dashboard` | Admin dashboard data |
| `admin/tickets` | `/api/v1/admin/tickets` | Queue, status, assignment, classification, notes, AI drafts |
| `ai` | (internal) | Provider factory, prompts, analysis service |
| `attachments` | (internal) | Local file storage for ticket uploads |
| `knowledge-base` | (internal) | Policy excerpts for AI context |
| `seed` | (script) | Sample dataset import |
| `audit-logs` | (internal) | Administrative audit trail |

## File Upload and Storage

Ticket attachments are stored on **local disk** at `backend/storage/ticket-attachments/` (gitignored).

| Setting | Value |
|---------|-------|
| Storage provider | `local` |
| Max file size | 5 MB |
| Allowed extensions | `.pdf`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.txt` |
| Multipart field name | `attachment` |
| Public access | None — download via authenticated ticket attachment routes |

Upload directories are created automatically. Failed uploads trigger best-effort temp file cleanup.

Implementation: `src/modules/attachments/ticketAttachment.service.js`, `src/middleware/ticketAttachmentUpload.js`.

## Admin Ticket Status Transitions

Administrators update status via `PATCH /api/v1/admin/tickets/{ticketId}/status`.

| From | Allowed transitions |
|------|---------------------|
| `OPEN` | `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `IN_PROGRESS` | `OPEN`, `RESOLVED`, `CLOSED` |
| `RESOLVED` | `IN_PROGRESS`, `CLOSED` |
| `CLOSED` | *(terminal — no further changes)* |

Entering `RESOLVED` sets `resolvedAt`. Leaving `RESOLVED` clears it. Entering `CLOSED` sets `closedAt`.

Administrative updates use a safe fallback when MongoDB transactions are unavailable: the ticket change is reverted if audit persistence fails.

## Tests

```bash
npm test              # Jest, runInBand
npm run test:watch    # Watch mode
```

**Verified:** 256 tests passed across 31 suites.

Tests use an in-memory MongoDB instance (`mongodb-memory-server`). They do not require production credentials or a running local MongoDB.

Integration tests cover auth, books, tickets, attachments, admin APIs, AI (mocked), seeding, security, and OpenAPI.

## Common Errors

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Environment configuration error` at startup | Invalid/missing `.env` | Copy `.env.example`; set `MONGODB_URI`, `CLIENT_URL`, `JWT_SECRET` (32+ chars) |
| `AI configuration error` | Invalid `AI_PROVIDER` or missing provider vars | Fix AI vars or remove `AI_PROVIDER` |
| MongoDB connection failure | MongoDB not running | Start MongoDB; verify URI |
| Seed configuration error | Missing `SEED_CONFIRM=yes` or seed passwords | Set all seed variables |
| Seed blocked on production DB name | Safety guard | Use a dev database name or `ALLOW_PRODUCTION_SEED=true` with strong credentials |
| CORS errors from browser | `CLIENT_URL` mismatch | Match frontend origin exactly |
| 403 CSRF on login | Missing or stale CSRF token | Fetch CSRF before POST; include cookie |
| Attachment rejected | Wrong MIME type or size | Use allowed types; max 5 MB |

## Architecture (source layout)

```
src/
├── server.js          # Startup, DB connection, AI init, graceful shutdown
├── app.js             # Express app factory (no listen)
├── config/            # Environment, database, Swagger/OpenAPI
├── constants/         # Shared enums and domain constants
├── middleware/        # Security, validation, uploads, error handling
├── modules/
│   ├── ai/            # Provider factory, adapters, prompts, analysis
│   ├── attachments/   # Local ticket attachment storage
│   ├── knowledge-base/# Policy excerpts and relevance retrieval
│   └── ...            # Auth, books, tickets, admin, seed, audit, users
├── routes/            # HTTP route definitions
└── utils/             # ApiError, ApiResponse, asyncHandler

docs/api/
├── openapi.yaml       # Central OpenAPI 3.x specification
├── architecture.md    # API conventions
└── endpoint-inventory.md

scripts/
├── seedDatabase.js
├── generateInvitation.js
└── validateOpenApi.js
```

## Related Documentation

- [Project README](../README.md) — full-stack quick start and troubleshooting
- [Frontend README](../frontend/README.md) — routes, React Query, proxy setup
- [API README](./docs/api/README.md) — Swagger access and validation
- [API architecture conventions](./docs/api/architecture.md)
- [Endpoint inventory](./docs/api/endpoint-inventory.md)
- [Cross-layer audit report](./docs/ASSIGNMENT-CROSS-LAYER-AUDIT-REPORT.md)
