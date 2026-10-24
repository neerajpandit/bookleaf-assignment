// import axios from 'axios';
// import { normalizeApiError } from './apiError.js';
// import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config.js';
// import { fetchCsrfToken, getCsrfHeaderName, clearCsrfToken } from './csrf.js';

// const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

// export const getApiBaseUrl = () => API_BASE_URL;

// const apiClient = axios.create({
//   baseURL: API_BASE_URL,
//   timeout: REQUEST_TIMEOUT_MS,
//   withCredentials: true,
//   headers: {
//     Accept: 'application/json',
//     'Content-Type': 'application/json',
//   },
// });

// let isHandlingUnauthorized = false;

// export const resetUnauthorizedGuard = () => {
//   isHandlingUnauthorized = false;
// };

// apiClient.interceptors.request.use(async (config) => {
//   const method = config.method?.toLowerCase();

//   if (method && MUTATING_METHODS.has(method) && !config.skipCsrf) {
//     const csrfToken = await fetchCsrfToken();
//     config.headers.set(getCsrfHeaderName(), csrfToken);
//   }

//   return config;
// });

// apiClient.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const normalized = normalizeApiError(error);
//     error.normalized = normalized;

//     const requestUrl = error.config?.url || '';
//     const isAuthMeRequest = requestUrl.includes('/auth/me');
//     const isLoginRequest = requestUrl.includes('/auth/login');

//     if (normalized.isUnauthorized && !isAuthMeRequest && !isLoginRequest && !isHandlingUnauthorized) {
//       isHandlingUnauthorized = true;
//       clearCsrfToken();
//     }

//     if (error.response?.status === 403 && error.response?.data?.message === 'Invalid or missing CSRF token') {
//       clearCsrfToken();
//     }

//     return Promise.reject(error);
//   },
// );

// export { apiClient as default, normalizeApiError };



import axios from 'axios';
import { normalizeApiError } from './apiError.js';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config.js';

export const getApiBaseUrl = () => API_BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

let isHandlingUnauthorized = false;

export const resetUnauthorizedGuard = () => {
  isHandlingUnauthorized = false;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const normalized = normalizeApiError(error);
    error.normalized = normalized;

    const requestUrl = error.config?.url || '';
    const isAuthMeRequest = requestUrl.includes('/auth/me');
    const isLoginRequest = requestUrl.includes('/auth/login');

    if (
      normalized.isUnauthorized &&
      !isAuthMeRequest &&
      !isLoginRequest &&
      !isHandlingUnauthorized
    ) {
      isHandlingUnauthorized = true;
    }

    return Promise.reject(error);
  },
);

export { apiClient as default, normalizeApiError };
