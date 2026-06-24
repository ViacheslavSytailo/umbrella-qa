import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = process.env.BASE_URL || 'https://dev.umbrellacost.dev';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['blob', { outputDir: 'blob-report' }],
    ['allure-playwright'],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: process.env.CI ? 60_000 : 30_000,
  },
  projects: [
    /* ---------- Auth setup ---------- */
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },

    /* ---------- API suite ---------- */
    {
      name: 'api',
      testMatch: /tests\/api\/.+\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
    },

    /* ---------- UI suite (Chromium) ---------- */
    {
      name: 'ui-chromium',
      testMatch: /tests\/ui\/.+\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
    },
  ],
});
