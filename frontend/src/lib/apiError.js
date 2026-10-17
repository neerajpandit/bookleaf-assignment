/**
 * Normalized API error shape returned by the Axios client.
 * @typedef {Object} NormalizedApiError
 * @property {string} message
 * @property {number|null} statusCode
 * @property {Array<{field: string, message: string}>|null} details
 * @property {boolean} isUnauthorized
 * @property {boolean} isForbidden
 * @property {boolean} isValidationError
 * @property {boolean} isNetworkError
 * @property {boolean} isRateLimited
 */

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

/**
 * @param {import('axios').AxiosError} error
 * @returns {NormalizedApiError}
 */
export function normalizeApiError(error) {
  if (!error.response) {
    return {
      message: error.code === 'ECONNABORTED'
        ? 'The request timed out. Please try again.'
        : 'Unable to reach the server. Check your connection and try again.',
      statusCode: null,
      details: null,
      isUnauthorized: false,
      isForbidden: false,
      isValidationError: false,
      isNetworkError: true,
      isRateLimited: false,
    };
  }

  const { status, data } = error.response;
  const message = typeof data?.message === 'string' ? data.message : DEFAULT_MESSAGE;
  const details = Array.isArray(data?.details) ? data.details : null;

  return {
    message,
    statusCode: status,
    details,
    isUnauthorized: status === 401,
    isForbidden: status === 403 && message !== 'Invalid or missing CSRF token',
    isValidationError: status === 400 && details !== null,
    isNetworkError: false,
    isRateLimited: status === 429,
  };
}

export default normalizeApiError;
