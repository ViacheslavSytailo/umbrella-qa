import { test as base } from '@playwright/test';
import { LoginPage, DashboardPage, CostExplorerPage } from '../pages';

/**
 * Extended Playwright fixtures providing:
 * - Pre-constructed page objects
 * - A network error collector (used by the 5xx assertion test)
 */
type UmbrellaFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  costExplorerPage: CostExplorerPage;
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
