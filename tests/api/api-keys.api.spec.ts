import { test, expect, request as apiRequest } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { testConfig } from '../../src/data/test-data';
import { ApiClient } from '../../src/helpers/api-client';
import { readAuthData } from '../../src/helpers/read-auth';

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
  let client: ApiClient;
  let apiContext: APIRequestContext;

  test.beforeAll(async () => {
    ({ authToken, apiKey, userId } = readAuthData());
    apiContext = await apiRequest.newContext();
    client = new ApiClient(apiContext);
    client.setAuth(authToken, apiKey);
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  // ── 1. Key is generated and structurally valid ────────

  test('apikey is generated at sign-in and has format userId:accountId:divisionId', () => {
    const parts = apiKey.split(':');
    expect(parts).toHaveLength(3);

    const [keyUserId, accountId, divisionId] = parts;
    expect(keyUserId.length).toBeGreaterThan(0);
    expect(accountId.length).toBeGreaterThan(0);
    expect(divisionId).toMatch(/^-?\d+$/); // numeric division id (may be -1 = no division)
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

  test('authenticated requests with apikey succeed', async () => {
    const res = await client.getUserRoles();

    expect(res.status()).toBe(200);
  });

  // ── 4. Negative cases ─────────────────────────────────

  test.describe('Negative cases', () => {
    test('protected endpoint rejects an unauthenticated request (401/403)', async () => {
      // Authorization boundary: /users/roles requires credentials. Without them
      // the gateway returns 401 (verified), proving the endpoint is protected.
      const res = await apiContext.get(`${testConfig.apiBaseUrl}/api/v1/users/roles`);
      expect([401, 403]).toContain(res.status());
    });
  });
});
