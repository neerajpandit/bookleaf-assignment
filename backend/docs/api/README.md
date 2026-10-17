# BookLeaf OpenAPI Documentation

## Specification Location

- Entry file: `docs/api/openapi.yaml`
- Reusable components: `docs/api/components/`
- Implemented path definitions: `docs/api/paths/`

## Swagger UI

When the backend server is running:

- **Swagger UI:** [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- **OpenAPI JSON:** [http://localhost:5000/api-docs/openapi.json](http://localhost:5000/api-docs/openapi.json)

Replace `5000` with your configured `PORT` value.

Swagger UI is intended for local development and documentation review. It does not expose secrets or environment variables.

## Validate the Specification

From the `backend/` directory:

```bash
npm run validate:openapi
```

This command dereferences and validates the OpenAPI 3.x document structure.

## Related Documentation

- [API Architecture Conventions](./architecture.md)
- [Endpoint Inventory (implemented vs proposed)](./endpoint-inventory.md)

## Authentication Scheme

The specification defines a **Bearer JWT** security scheme for future protected endpoints. No live token is embedded in the spec. Public endpoints such as `/api/v1/health` do not require authentication.
