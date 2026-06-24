import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../src/pages/login.page';
import { testConfig } from '../src/data/test-data';
import path from 'path';
import fs from 'fs';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

/**
 * Auth setup project — runs once before API & UI suites.
 *
 * 1. Opens the login page in a real browser.
 * 2. Signs in with the test credentials.
 * 3. Waits for the dashboard to load (proves auth succeeded).
 * 4. Extracts the Cognito `authToken`, `apikey` header and `accountId` from localStorage.
 * 5. Saves browser storageState so UI tests reuse the session.
 * 6. Writes the auth data to a shared JSON file so API tests can read it.
 *
 * The `apikey` header (format: `userId:accountId:divisionId`) is required by the
 * Umbrella API alongside the JWT — without it, requests timeout at the API gateway.
 */
setup('authenticate and store session', async ({ page }) => {
  // Ensure the auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAndWaitForDashboard(testConfig.user.email, testConfig.user.password);

  // Verify we're on the dashboard
  await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 30_000 });

  // Capture one real API request to extract the exact apikey header value
  let capturedApiKey = '';
  const requestListener = (req: import('@playwright/test').Request) => {
    if (req.url().includes('api.dev.umbrellacost') && !capturedApiKey) {
      const key = req.headers()['apikey'];
      if (key) capturedApiKey = key;
    }
  };
  page.on('request', requestListener);

  // Wait for the dashboard to fire API requests
  await page.waitForTimeout(4_000);
  page.off('request', requestListener);

  // Extract auth token from localStorage for API tests
  const authData = await page.evaluate(() => {
    const authToken =
      localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    const userId =
      localStorage.getItem('authUserKey') ||
      localStorage.getItem('dispUserKey') ||
      '';
    const accountId = localStorage.getItem('currDispUserAccountKey') || '';
    const divisionId = localStorage.getItem('currDispUserDivisionId') || '0';
    return { authToken, userId, accountId, divisionId };
  });

  // Build apikey header if not captured from a real request
  const apiKey =
    capturedApiKey ||
    `${authData.userId}:${authData.accountId}:${authData.divisionId}`;

  // Save storage state for UI tests
  await page.context().storageState({ path: authFile });

  // Also save the raw token for API tests
  const tokenFile = path.join(authDir, 'token.json');
  fs.writeFileSync(
    tokenFile,
    JSON.stringify(
      {
        authToken: authData.authToken,
        apiKey,
        userId: authData.userId,
        accountId: authData.accountId,
        divisionId: authData.divisionId,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  console.log(`✅ Auth setup complete. Token length: ${authData.authToken.length}, apiKey: ${apiKey}`);
});
