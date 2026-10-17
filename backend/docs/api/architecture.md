# BookLeaf API Architecture Conventions

This document defines REST API conventions for the BookLeaf Author Support Portal backend.

## Base URL and Versioning

- All API routes use the prefix **`/api/v1`**.
- Breaking changes require a new major version (for example, `/api/v2`).
- Non-versioned infrastructure routes:
  - `GET /api/v1/health` — readiness check
  - `GET /api-docs` — Swagger UI (development/documentation)
  - `GET /api-docs/openapi.json` — OpenAPI specification (JSON)

## HTTP Methods and Resource Naming

| Method | Usage |
|--------|--------|
| `GET` | Retrieve resources or collections |
| `POST` | Create resources or trigger actions |
| `PATCH` | Partial updates |
| `DELETE` | Remove resources when explicitly required |

Conventions:

- Use **plural nouns** for collections: `/books`, `/tickets`.
- Use **kebab-case** only when needed for readability; prefer simple nouns.
- Nest related resources logically: `/authors/me/books`, `/admin/tickets`.
- Use route parameters for identifiers: `/tickets/:ticketId`.

## Request Validation

- Request validation uses **Joi** through shared middleware (`validate(schema, property)`).
- Supported properties: `body`, `query`, `params`.
- Unknown fields are stripped (`stripUnknown: true`).
- Multiple validation errors are returned together (`abortEarly: false`).

## Authentication and Authorization (Future Steps)

- Protected routes will use **JWT bearer tokens** in the `Authorization` header.
- Authentication middleware runs before controllers.
- Authorization middleware enforces role-based access:
  - **AUTHOR** — own data only
  - **ADMIN** — cross-author administrative access
- Public routes (such as health and future login) do not require JWT.

## Success Responses

Successful responses use the shared **`ApiResponse`** shape:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Human-readable summary",
  "data": {}
}
```

- `data` may be `null`, an object, or an array depending on the endpoint.
- HTTP status codes reflect the operation (`200`, `201`, etc.).

## Error Responses

Application and validation errors use a consistent JSON structure:

```json
{
  "success": false,
  "message": "Safe error summary",
  "details": [
    { "field": "subject", "message": "Subject is required" }
  ]
}
```

- `details` is included for validation errors and some operational errors.
- Production responses do not expose stack traces, credentials, or internal exceptions.
- Unknown routes return **404** with `{ success: false, message: "Route not found: ..." }`.

## Pagination and Filtering (Future List Endpoints)

List endpoints will support:

| Query param | Purpose |
|-------------|---------|
| `page` | 1-based page number (default `1`) |
| `limit` | Page size with a sensible maximum |
| `sort` | Sort field and direction where applicable |
| Domain filters | e.g. `status`, `category`, `priority` on admin ticket queues |

Paginated responses will extend `data` with metadata such as `items`, `page`, `limit`, and `total`.

## HTTP Status Codes

| Code | Usage |
|------|--------|
| `200` | Successful read/update |
| `201` | Resource created |
| `400` | Validation failure or malformed JSON |
| `401` | Missing or invalid authentication |
| `403` | Authenticated but not authorized |
| `404` | Route or resource not found |
| `500` | Unexpected server error |
| `503` | Dependency unavailable (health check) |

## Middleware Order

1. Security (`helmet`, `cors`)
2. Body parsers
3. API routes (`/api/v1`)
4. Documentation routes (`/api-docs`)
5. 404 handler
6. Centralized error handler

## OpenAPI Documentation

- Source specification: `docs/api/openapi.yaml`
- Only **implemented** endpoints are registered in the live OpenAPI document.
- Proposed endpoints are tracked separately in `endpoint-inventory.md`.
