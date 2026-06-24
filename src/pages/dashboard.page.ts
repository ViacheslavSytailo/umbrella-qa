import { type Page, type Locator, expect } from '@playwright/test';

/**
 * DashboardPage – Page Object for the main Dashboard (/).
 * Contains cost summary widgets, Daily Cost chart, navigation sidebar.
 *
 * Selectors are based on the `id` attributes discovered from the live app:
 *   #sideBarItemButton-<name>  — top-level sidebar items
 *   #innerSideBarItemButton-<name>  — expanded sub-menu items
 */
export class DashboardPage {
  readonly page: Page;

  // ── Dashboard content ─────────────────────────────────
  readonly welcomeBanner: Locator;

  // ── Sidebar – top-level items ─────────────────────────
  readonly sidebarDashboard: Locator;
  readonly sidebarUnitEconomics: Locator;
  readonly sidebarRecommendations: Locator;
  readonly sidebarCostUsage: Locator;
  readonly sidebarCostAllocation: Locator;
  readonly sidebarCommitment: Locator;
  readonly sidebarMonitoring: Locator;
  readonly sidebarPartner: Locator;

  constructor(page: Page) {
    this.page = page;

    // Welcome banner
    this.welcomeBanner = page.locator('text=Welcome');

    // Sidebar navigation – use stable id-based selectors
    this.sidebarDashboard = page.locator('#sideBarItemButton-dashboard');
    this.sidebarUnitEconomics = page.locator('#sideBarItemButton-unitEconomics');
    this.sidebarRecommendations = page.locator('#sideBarItemButton-recommendations');
    this.sidebarCostUsage = page.locator('#sideBarItemButton-costAndUsage');
    this.sidebarCostAllocation = page.locator('#sideBarItemButton-costAllocation');
    this.sidebarCommitment = page.locator('#sideBarItemButton-commitment');
    this.sidebarMonitoring = page.locator('#sideBarItemButton-monitoring');
    this.sidebarPartner = page.locator('#sideBarItemButton-partner');
  }

  // ── Actions ───────────────────────────────────────────

  async goto() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    // Wait for the welcome banner to confirm the app rendered
    await this.welcomeBanner.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async navigateToCostUsageExplorer() {
    // Click the top-level "Cost & Usage" sidebar item to expand sub-menu
    await this.sidebarCostUsage.click();
    // Wait for and click the "Cost & Usage Explorer" sub-item
    const explorerLink = this.page.locator('#innerSideBarItemButton-costAndUsageExplorer');
    await explorerLink.waitFor({ state: 'visible', timeout: 5_000 });
    await explorerLink.click();
    await this.page.waitForURL(/cost-usage/, { timeout: 15_000 });
    await this.page.waitForLoadState('networkidle');
  }

  // ── Assertions ────────────────────────────────────────

  async expectDashboardLoaded() {
    await expect(this.welcomeBanner).toBeVisible({ timeout: 30_000 });
  }

  async expectSidebarVisible() {
    await expect(this.sidebarDashboard).toBeVisible({ timeout: 10_000 });
    await expect(this.sidebarCostUsage).toBeVisible({ timeout: 10_000 });
  }
}
