import apiClient from '../../../lib/apiClient.js';
import { clearCsrfToken } from '../../../lib/csrf.js';
import { resetUnauthorizedGuard } from '../../../lib/apiClient.js';

/**
 * @typedef {Object} PublicUser
 * @property {string} id
 * @property {string} email
 * @property {'AUTHOR'|'ADMIN'} role
 * @property {string} [authorId]
 * @property {string} name
 * @property {string} [phone]
 * @property {string} [city]
 * @property {string} [joinedDate]
 * @property {boolean} isActive
 */

/**
 * @param {import('axios').AxiosResponse} response
 * @returns {PublicUser}
 */
const extractUser = (response) => response.data?.data?.user ?? null;

export const getCurrentUser = async () => {
  const response = await apiClient.get('/auth/me');
  return extractUser(response);
};

/**
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<PublicUser>}
 */
export const login = async (credentials) => {
  const response = await apiClient.post('/auth/login', credentials);
  resetUnauthorizedGuard();
  return extractUser(response);
};

export const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    clearCsrfToken();
    resetUnauthorizedGuard();
  }
};

export default {
  getCurrentUser,
  login,
  logout,
};
