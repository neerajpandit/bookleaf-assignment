import { validateOpenApiSpec, OPENAPI_SPEC_PATH } from '../src/config/swagger.js';

const run = async () => {
  try {
    await validateOpenApiSpec();
    console.log(`OpenAPI specification is valid: ${OPENAPI_SPEC_PATH}`);
    process.exit(0);
  } catch (error) {
    console.error('OpenAPI validation failed:', error.message);
    process.exit(1);
  }
};

run();
