import { test as base, type Page, type BrowserContext } from '@playwright/test';
import { LoginPage, DashboardPage, CostExplorerPage } from '../pages';
import { ApiClient } from '../helpers/api-client';

/**
 * Extended Playwright fixtures providing:
 * - Pre-constructed page objects
 * - Authenticated API client
 * - Console & network error collectors
 */
type UmbrellaFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  costExplorerPage: CostExplorerPage;
  apiClient: ApiClient;
  consoleErrors: string[];
  networkErrors: { url: string; status: number; statusText: string }[];
};

export const test = base.extend<UmbrellaFixtures>({
  // ── Page Objects ──────────────────────────────────────

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  costExplorerPage: async ({ page }, use) => {
    await use(new CostExplorerPage(page));
  },

  // ── API Client ────────────────────────────────────────

  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request);
    await use(client);
  },

  // ── Console Error Collector ───────────────────────────

  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await use(errors);
  },

  // ── Network Error Collector ───────────────────────────

  networkErrors: async ({ page }, use) => {
    const errors: { url: string; status: number; statusText: string }[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400) {
        errors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
        });
      }
    });
    await use(errors);
  },
});

export { expect } from '@playwright/test';
