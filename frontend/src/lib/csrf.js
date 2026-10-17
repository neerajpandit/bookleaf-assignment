import axios from 'axios';
import { API_BASE_URL, REQUEST_TIMEOUT_MS, CSRF_HEADER_NAME } from './config.js';

let cachedCsrfToken = null;
let csrfFetchPromise = null;

const csrfClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

export const getCsrfHeaderName = () => CSRF_HEADER_NAME;

export const clearCsrfToken = () => {
  cachedCsrfToken = null;
  csrfFetchPromise = null;
};

export const fetchCsrfToken = async () => {
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }

  if (!csrfFetchPromise) {
    csrfFetchPromise = csrfClient
      .get('/auth/csrf-token')
      .then((response) => {
        const token = response.data?.data?.csrfToken;
        if (!token) {
          throw new Error('CSRF token missing from server response');
        }
        cachedCsrfToken = token;
        return token;
      })
      .finally(() => {
        csrfFetchPromise = null;
      });
  }

  return csrfFetchPromise;
};

export default fetchCsrfToken;
