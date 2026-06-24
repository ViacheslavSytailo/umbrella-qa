import { test, expect, request as apiRequest } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { testConfig } from '../../src/data/test-data';
import { ApiClient } from '../../src/helpers/api-client';
import { readAuthData } from '../../src/helpers/read-auth';

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

  test('should sign in with a valid Cognito token', async () => {
    const res = await client.signinWithToken();

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
    test('should reject sign-in with no auth headers (401/403)', async () => {
      const res = await apiContext.post(
        `${testConfig.apiBaseUrl}/api/v1/users/signin-with-token`,
        { headers: { 'Content-Type': 'application/json' }, data: {} },
      );

      expect([401, 403]).toContain(res.status());
    });

    test('should reject sign-in with a malformed JWT (401/403)', async () => {
      const badClient = new ApiClient(apiContext);
      badClient.setAuth('eyJhbGciOiJSUzI1NiJ9.invalid.payload', apiKey);
      const res = await badClient.signinWithToken();

      expect([401, 403]).toContain(res.status());
    });

    test('should return 403/404 for a non-existent endpoint', async () => {
      const res = await apiContext.get(
        `${testConfig.apiBaseUrl}/api/v1/this-endpoint-does-not-exist`,
        { headers: { Authorization: authToken, apikey: apiKey } },
      );

      expect([403, 404]).toContain(res.status());
    });
  });
});
