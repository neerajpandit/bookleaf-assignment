export const isTransientAiError = (error) => {
  const message = (error?.message || '').toLowerCase();
  const statusCode = error?.statusCode;

  if (statusCode === 429 || statusCode === 503 || statusCode === 502) {
    return true;
  }

  return (
    message.includes('rate limit') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('temporarily unavailable') ||
    message.includes('econnreset') ||
    message.includes('network')
  );
};

export const createProviderHttpError = (providerLabel, status) => {
  const error = new Error(`${providerLabel} request failed with status ${status}`);
  error.statusCode = status;
  return error;
};

export default {
  isTransientAiError,
  createProviderHttpError,
};
