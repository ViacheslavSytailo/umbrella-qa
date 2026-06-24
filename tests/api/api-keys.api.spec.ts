import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const API_BASE = process.env.API_BASE_URL ?? 'https://api.dev.umbrellacost.dev';

interface AuthData {
  authToken: string;
  apiKey: string;
  userId: string;
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
 * API-key generation flow tests.
 *
 * HOW THE UMBRELLA API KEY SCHEME WORKS
 * ──────────────────────────────────────
 * Umbrella does not expose a user-managed CRUD endpoint for API keys
 * (confirmed by: full JS bundle analysis, live network capture across
 * all account/settings pages, and direct probing of candidate endpoints).
 *
 * Instead the platform uses a *server-generated composite key* that is
 * assembled at sign-in time and stored in localStorage:
 *
 *   apikey = `${userId}:${accountId}:${divisionId}`
 *
 * This key must accompany every API request alongside the Cognito JWT.
 * Without it the API gateway does not respond (the request times out).
 * That makes the auth setup — which captures the key from a live browser
 * request — the "generation flow" under test.
 *
 * This suite verifies:
 *   1. The key is present and structurally valid after sign-in
 *   2. The userId component matches the JWT `sub` claim (identity binding)
 *   3. Authenticated requests succeed with the key
 *   4. Requests without credentials are rejected (negative cases)
 */
test.describe('API-key generation flow', () => {
  let authToken: string;
  let apiKey: string;
  let userId: string;

  test.beforeAll(() => {
    ({ authToken, apiKey, userId } = readAuthData());
  });

  // ── 1. Key is generated and structurally valid ────────

  test('apikey is generated at sign-in and has format userId:accountId:divisionId', () => {
    const parts = apiKey.split(':');
    expect(parts).toHaveLength(3);

    const [keyUserId, accountId, divisionId] = parts;
    expect(keyUserId.length).toBeGreaterThan(0);
    expect(accountId.length).toBeGreaterThan(0);
    expect(divisionId).toMatch(/^\d+$/); // numeric division id
  });

  // ── 2. Key is bound to the authenticated identity ─────

  test('userId in apikey matches the sub claim in the Cognito JWT', () => {
    const payload = JSON.parse(
      Buffer.from(authToken.split('.')[1], 'base64').toString('utf-8'),
    ) as { sub: string };

    expect(apiKey.split(':')[0]).toBe(payload.sub);
    expect(apiKey.split(':')[0]).toBe(userId);
  });

  // ── 3. Key grants access to protected resources ───────

  test('authenticated requests with apikey succeed', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/users/roles`, {
      headers: makeHeaders(authToken, apiKey),
    });

    expect(res.status()).toBe(200);
  });

  // ── 4. Negative cases ─────────────────────────────────

  test.describe('Negative cases', () => {
    test('requests with no credentials are rejected (401/403)', async ({ request }) => {
      const res = await request.get(`${API_BASE}/api/v1/users/roles`);
      expect([401, 403]).toContain(res.status());
    });

    test('admin-only endpoint is inaccessible to a regular user (403/404/405)', async ({
      request,
    }) => {
      const res = await request.put(`${API_BASE}/api/v1/admin/accounts`, {
        headers: makeHeaders(authToken, apiKey),
        data: { test: 'should-fail' },
      });
      expect([401, 403, 404, 405]).toContain(res.status());
    });
  });
});
