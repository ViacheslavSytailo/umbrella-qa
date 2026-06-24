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
  const data = JSON.parse(fs.readFileSync(tokenPath, 'utf-8')) as AuthData;
  return data;
}

/** Headers required by the Umbrella API gateway on every request. */
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
 * Authentication API tests.
 *
 * Covers:
 *   - Successful sign-in with a valid Cognito token
 *   - JWT structure and expiry validation
 *   - Negative: no token, malformed token, non-existent endpoint
 */
test.describe('Authentication API', () => {
  let authToken: string;
  let apiKey: string;

  test.beforeAll(() => {
    ({ authToken, apiKey } = readAuthData());
  });

  test('should sign in with a valid Cognito token', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/v1/users/signin-with-token`, {
      headers: makeHeaders(authToken, apiKey),
      data: {},
    });

    expect(res.status()).toBeLessThan(300);
    const body = await res.json();
    expect(body).toBeDefined();
  });

  test('auth token should be a valid non-expired Cognito JWT', () => {
    const parts = authToken.split('.');
    expect(parts).toHaveLength(3);

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8')) as {
      email: string;
      token_use: string;
      exp: number;
      iss: string;
    };

    expect(payload.email).toBe(testConfig.user.email);
    expect(payload.token_use).toBe('id');
    expect(payload.exp * 1000).toBeGreaterThan(Date.now());
    expect(payload.iss).toContain('cognito-idp');
  });

  test.describe('Negative cases', () => {
    test('should reject sign-in with no auth headers (401/403)', async ({ request }) => {
      const res = await request.post(`${API_BASE}/api/v1/users/signin-with-token`, {
        headers: { 'Content-Type': 'application/json' },
        data: {},
      });

      expect([401, 403]).toContain(res.status());
    });

    test('should reject sign-in with a malformed JWT (401/403)', async ({ request }) => {
      const res = await request.post(`${API_BASE}/api/v1/users/signin-with-token`, {
        headers: makeHeaders('eyJhbGciOiJSUzI1NiJ9.invalid.payload', apiKey),
        data: {},
      });

      expect([401, 403]).toContain(res.status());
    });

    test('should return 403/404 for a non-existent endpoint', async ({ request }) => {
      const res = await request.get(`${API_BASE}/api/v1/this-endpoint-does-not-exist`, {
        headers: makeHeaders(authToken, apiKey),
      });

      expect([403, 404]).toContain(res.status());
    });
  });
});
