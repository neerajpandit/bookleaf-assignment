import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEMO_AUTHOR_PASSWORD = 'Author@123';
export const DEMO_ADMIN_PASSWORD = 'admin';

export const DEFAULT_DATASET_PATH = path.resolve(
  __dirname,
  '../../../docs/FULLSTACK-SAMPLEDATA (1) (1).json',
);

export const SECURITY_FIELDS = ['passwordHash', 'role', 'tokenVersion', 'isActive'];
