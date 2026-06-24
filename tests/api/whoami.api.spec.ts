import { test, expect, request as apiRequest } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { testConfig } from '../../src/data/test-data';
import { ApiClient } from '../../src/helpers/api-client';
import { readAuthData } from '../../src/helpers/read-auth';

/**
 * User-role / whoami verification tests.
 *
 * Covers:
 *   - Identity: signin-with-token returns the correct email + userKey (identity binding)
 *   - Roles: /users/roles returns roles bound to the authenticated user/account
 *   - Sub-users: current user can list their sub-users
 *   - Negative: unauthenticated request is rejected
 */
test.describe('User role / whoami', () => {
  let authToken: string;
  let apiKey: string;
  let client: ApiClient;
  let apiContext: APIRequestContext;

  test.beforeAll(async () => {
    ({ authToken, apiKey } = readAuthData());
    apiContext = await apiRequest.newContext();
    client = new ApiClient(apiContext);
    client.setAuth(authToken, apiKey);
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('signin-with-token should return the authenticated user identity', async () => {
    const res = await client.signinWithToken();

    expect(res.status()).toBeLessThan(300);
    const body = (await res.json()) as { userName?: string; email?: string; userKey?: string };

    // The platform returns the email under `userName`; keep `email` as a fallback.
    expect(body.userName ?? body.email).toBe(testConfig.user.email);

    // Identity binding: userKey must equal the userId component of the apikey.
    expect(body.userKey).toBe(apiKey.split(':')[0]);
  });

  test('should return roles bound to the authenticated identity', async () => {
    const res = await client.getUserRoles();

    expect(res.status()).toBe(200);
    const roles = (await res.json()) as Array<{
      roleName: string;
      userKey: string;
      accountKey: string;
    }>;

    expect(Array.isArray(roles)).toBe(true);
    expect(roles.length).toBeGreaterThan(0);

    const [userId, accountId] = apiKey.split(':');
    for (const role of roles) {
      // Each role must belong to this user/account (no leaking of others' roles)
      expect(role.userKey).toBe(userId);
      expect(role.accountKey).toBe(accountId);
      expect(typeof role.roleName).toBe('string');
      expect(role.roleName.length).toBeGreaterThan(0);
    }
  });

  test('should return sub-users list', async () => {
    const res = await client.getSubUsers();

    expect(res.status()).toBe(200);
  });

  test('unauthenticated whoami request should be rejected (401/403)', async () => {
    const unauthContext = await apiRequest.newContext();
    const res = await unauthContext.post(
      `${testConfig.apiBaseUrl}/api/v1/users/signin-with-token`,
      { headers: { 'Content-Type': 'application/json' }, data: {} },
    );
    await unauthContext.dispose();

    expect([401, 403]).toContain(res.status());
  });
});
