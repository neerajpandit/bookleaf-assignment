import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const hashPassword = async (plainPassword) => bcrypt.hash(plainPassword, SALT_ROUNDS);

export const comparePassword = async (plainPassword, passwordHash) =>
  bcrypt.compare(plainPassword, passwordHash);

export const hashToken = async (plainToken) => bcrypt.hash(plainToken, SALT_ROUNDS);

export const compareToken = async (plainToken, tokenHash) => bcrypt.compare(plainToken, tokenHash);
