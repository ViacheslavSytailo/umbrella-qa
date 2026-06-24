import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/** Credentials & URLs used across the test suite. */
export const testConfig = {
  baseUrl: process.env.BASE_URL || 'https://dev.umbrellacost.dev',
  apiBaseUrl: process.env.API_BASE_URL || 'https://api.dev.umbrellacost.dev',
  user: {
    email: process.env.USER_EMAIL || '',
    password: process.env.USER_PASSWORD || '',
  },
} as const;
