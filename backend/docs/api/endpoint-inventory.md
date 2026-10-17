# API Endpoint Inventory

Status legend:

- **Implemented** — operational and documented in OpenAPI
- **Proposed** — planned; not registered in OpenAPI until approved in a later step

## Implemented

| Method | Path | Tag | Auth | Status |
|--------|------|-----|------|--------|
| `GET` | `/api/v1/health` | System | Public | **Implemented** |
| `GET` | `/api/v1/auth/csrf-token` | Authentication | Public | **Implemented** |
| `POST` | `/api/v1/auth/register` | Authentication | CSRF | **Implemented** |
| `POST` | `/api/v1/auth/login` | Authentication | CSRF | **Implemented** |
| `GET` | `/api/v1/auth/me` | Authentication | Cookie session | **Implemented** |
| `POST` | `/api/v1/auth/logout` | Authentication | Cookie session + CSRF | **Implemented** |
| `GET` | `/api/v1/auth/test/admin-only` | Authentication | Admin cookie session | **Implemented** (authorization test route) |
| `GET` | `/api/v1/books` | Books | Author cookie session | **Implemented** |
| `GET` | `/api/v1/books/{bookId}` | Books | Author cookie session | **Implemented** |
| `GET` | `/api/v1/tickets` | Tickets | Author cookie session | **Implemented** |
| `POST` | `/api/v1/tickets` | Tickets | Author cookie session | **Implemented** |
| `GET` | `/api/v1/tickets/{ticketId}` | Tickets | Author cookie session | **Implemented** |
| `POST` | `/api/v1/tickets/{ticketId}/messages` | Tickets | Author cookie session | **Implemented** |
| `GET` | `/api/v1/admin/authors` | Admin Authors | Admin cookie session | **Implemented** |
| `GET` | `/api/v1/admin/authors/{authorUserId}` | Admin Authors | Admin cookie session | **Implemented** |
| `GET` | `/api/v1/admin/authors/{authorUserId}/books` | Admin Authors | Admin cookie session | **Implemented** |
| `GET` | `/api/v1/admin/authors/{authorUserId}/royalty-summary` | Admin Authors | Admin cookie session | **Implemented** |
| `GET` | `/api/v1/admin/tickets` | Admin Tickets | Admin cookie session | **Implemented** |
| `PATCH` | `/api/v1/admin/tickets/{ticketId}/assignment` | Admin Tickets | Admin cookie session | **Implemented** |
| `PATCH` | `/api/v1/admin/tickets/{ticketId}/status` | Admin Tickets | Admin cookie session | **Implemented** |
| `PATCH` | `/api/v1/admin/tickets/{ticketId}/classification` | Admin Tickets | Admin cookie session | **Implemented** |
| `GET` | `/api/v1/admin/tickets/{ticketId}/messages` | Admin Tickets | Admin cookie session | **Implemented** |
| `POST` | `/api/v1/admin/tickets/{ticketId}/messages` | Admin Tickets | Admin cookie session | **Implemented** |
| `GET` | `/api/v1/admin/tickets/{ticketId}/notes` | Admin Tickets | Admin cookie session | **Implemented** |
| `POST` | `/api/v1/admin/tickets/{ticketId}/notes` | Admin Tickets | Admin cookie session | **Implemented** |
| `GET` | `/api/v1/admin/tickets/{ticketId}` | Admin Tickets | Admin cookie session | **Implemented** |
| `POST` | `/api/v1/admin/tickets/{ticketId}/ai/draft` | Admin Tickets | Admin cookie session | **Implemented** |

## Proposed — Books

All planned read-only book endpoints are implemented.

## Proposed — Author Tickets

All planned author ticket endpoints for Step 9A are implemented.

## Non-production Development Routes

| Method | Path | Purpose | Notes |
|--------|------|---------|-------|
| `POST` | `/api/v1/demo/validate` | Joi middleware demonstration | Disabled when `NODE_ENV=production`; not in OpenAPI |
