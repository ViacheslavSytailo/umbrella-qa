import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { testConfig } from '../../src/data/test-data';

const API_BASE = process.env.API_BASE_URL ?? 'https://api.dev.umbrellacost.dev';

interface AuthData {
  authToken: string;
  apiKey: string;
}

function readAuthData(): AuthData {
  const tokenPath = path.join(__dirname, '../../playwright/.auth/token.json');
  if (!fs.existsSync(tokenPath)) {
    throw new Error('Auth token not found. Run auth-setup first.');
  }
  return JSON.parse(fs.readFileSync(tokenPath, 'utf-8')) as AuthData;
}

function makeHeaders(authToken: string, apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    accept: 'application/json, text/plain, */*',
    Authorization: authToken,
    apikey: apiKey,
    Referer: 'https://dev.umbrellacost.dev/',
    commonparams: JSON.stringify({ isPpApplied: false }),
  };
}

/**
 * User-role / whoami verification tests.
 *
 * Covers:
 *   - Identity: signin-with-token returns correct user email
 *   - Roles: /users/roles returns a parseable payload
 *   - Sub-users: current user can list their sub-users
 *   - Negative: unauthenticated request is rejected
 */
test.describe('User role / whoami', () => {
  let authToken: string;
  let apiKey: string;

  test.beforeAll(() => {
    ({ authToken, apiKey } = readAuthData());
  });

  test('signin-with-token should return the authenticated user identity', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/v1/users/signin-with-token`, {
      headers: makeHeaders(authToken, apiKey),
      data: {},
    });

    expect(res.status()).toBeLessThan(300);
    const body = await res.json() as Record<string, unknown>;

    // The response must identify the user in some shape
    const email =
      (body['email'] as string | undefined) ??
      (body['userName'] as string | undefined) ??
      ((body['user'] as Record<string, unknown> | undefined)?.['email'] as string | undefined);

    expect(email).toBe(testConfig.user.email);
  });

  test('should return user roles', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/users/roles`, {
      headers: makeHeaders(authToken, apiKey),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
  });

  test('should return sub-users list', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/users/subUsers`, {
      headers: makeHeaders(authToken, apiKey),
    });

    expect(res.status()).toBe(200);
  });

  test('unauthenticated whoami request should be rejected (401/403)', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/v1/users/signin-with-token`, {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    });

    expect([401, 403]).toContain(res.status());
  });
});
