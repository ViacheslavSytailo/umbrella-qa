import { type Page, type Locator, expect } from '@playwright/test';

/**
 * CostExplorerPage – Page Object for Cost & Usage Explorer.
 * URL pattern: /cost-usage/cost-usage-explorer
 *
 * Selectors are derived from the actual DOM structure of the live app.
 * The app uses CSS modules (hashed class names) so we rely on:
 *   - stable data-automation-id attributes
 *   - semantic role/aria attributes
 *   - text content with .first() to avoid strict mode violations
 */
export class CostExplorerPage {
  readonly page: Page;

  // ── Page header ───────────────────────────────────────
  readonly pageTitle: Locator;
  readonly latestInvoiceDate: Locator;

  // ── Toolbar controls ──────────────────────────────────
  // Group By trigger button (contains the current selection label)
  readonly groupByTrigger: Locator;
  // Period dropdown trigger (contains "Daily", "Monthly", etc.)
  readonly periodTrigger: Locator;
  readonly applyButton: Locator;

  // ── Cost display ──────────────────────────────────────
  readonly totalCostHeading: Locator;
  readonly totalCostValue: Locator;
  readonly costMetricTrigger: Locator;

  // ── Chart container ───────────────────────────────────
  readonly chartContainer: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header
    this.pageTitle = page.getByRole('heading', { name: 'Cost & Usage Explorer' }).first();
    this.latestInvoiceDate = page.locator('text=Latest invoice date');

    // Group By — uses a custom div with automation-id, not a button
    this.groupByTrigger = page.locator('[automation-id="primaryGroupBy"]');

    // Period dropdown — the trigger shows the current period value
    this.periodTrigger = page
      .locator('button[class*="triggerLabel"], button:has-text("Daily"), button:has-text("Monthly")')
      .first();

    // Apply button
    this.applyButton = page.getByRole('button', { name: 'Apply' });

    // Total cost heading — "Total Cost: Amortized"
    this.totalCostHeading = page
      .getByRole('heading', { name: /Total Cost/ })
      .first();

    // Total cost dollar value — the main large number
    this.totalCostValue = page.locator('[class*="number"]').first();

    // Cost metric selector (Amortized / Unblended / etc.)
    this.costMetricTrigger = page
      .locator('[class*="triggerLabel"]')
      .filter({ hasText: /Amortized|Unblended/i })
      .first();

    // Chart
    this.chartContainer = page.locator('.recharts-wrapper, svg').first();
  }

  // ── Navigation ────────────────────────────────────────

  async goto() {
    await this.page.goto('/cost-usage/cost-usage-explorer', { waitUntil: 'domcontentloaded' });
    await this.waitForPageReady();
  }

  async waitForPageReady() {
    // Wait for the latest invoice date badge — it only appears after data loads
    await this.latestInvoiceDate.waitFor({ state: 'visible', timeout: 30_000 });
  }

  // ── Group By ──────────────────────────────────────────

  async openGroupByDropdown() {
    await this.groupByTrigger.click();
    // Wait for the dropdown panel to render
    await this.page.waitForTimeout(300);
  }

  async selectGroupBy(option: string) {
    await this.openGroupByDropdown();
    await this.page
      .locator(`[data-automation-id="group-by-option-${option}"]`)
      .click();
    // Close panel by clicking elsewhere
    await this.pageTitle.click();
  }

  // ── Period selection ──────────────────────────────────

  async selectPeriod(period: 'Yearly' | 'Quarterly' | 'Monthly' | 'Weekly' | 'Daily' | 'Hourly') {
    await this.periodTrigger.click();
    await this.page.waitForTimeout(300);
    // Select from the dropdown list
    await this.page
      .getByRole('option', { name: period })
      .or(this.page.locator(`[data-automation-id="period-option-${period}"]`))
      .or(this.page.locator(`li:has-text("${period}")`))
      .first()
      .click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── Apply ─────────────────────────────────────────────

  async clickApply() {
    await this.applyButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── Assertions ────────────────────────────────────────

  async expectPageVisible() {
    await expect(this.latestInvoiceDate).toBeVisible({ timeout: 30_000 });
  }

  async expectChartVisible() {
    await expect(this.chartContainer).toBeVisible({ timeout: 15_000 });
  }

  async expectTotalCostVisible() {
    await expect(this.totalCostHeading).toBeVisible({ timeout: 15_000 });
    await expect(this.totalCostValue).toBeVisible();
  }

  async expectApplyButtonVisible() {
    await expect(this.applyButton).toBeVisible();
  }
}
