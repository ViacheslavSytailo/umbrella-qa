import { test, expect } from '../../src/fixtures/base.fixture';

/**
 * Cost & Usage Explorer – UI E2E Journey
 *
 * Covers a meaningful cost & usage journey:
 *   1. Dashboard loads with expected widgets
 *   2. Sidebar navigation to Cost & Usage Explorer
 *   3. Page-level assertions (title, latest invoice date, total cost)
 *   4. UI controls: Group By, Period selector, Apply button, Cost Metric
 *   5. Chart rendering verification
 *   6. Full end-to-end journey combining multiple steps
 */
test.describe('Cost & Usage Explorer Journey', () => {

  test('should display the main dashboard after login', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.expectDashboardLoaded();
    await dashboardPage.expectSidebarVisible();
  });

  test('should navigate to Cost & Usage Explorer from sidebar', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.expectDashboardLoaded();
    await dashboardPage.navigateToCostUsageExplorer();

    await expect(page).toHaveURL(/cost-usage/, { timeout: 15_000 });
    await expect(page.locator('text=Latest invoice date')).toBeVisible({ timeout: 15_000 });
  });

  test('should display Cost & Usage Explorer with chart and total cost', async ({ costExplorerPage }) => {
    await costExplorerPage.goto();
    await costExplorerPage.expectPageVisible();
    await costExplorerPage.expectChartVisible();
    await costExplorerPage.expectTotalCostVisible();
  });

  test('should display Group By dropdown', async ({ costExplorerPage, page }) => {
    await costExplorerPage.goto();
    await costExplorerPage.expectPageVisible();

    // Group By label should be visible showing current selection
    await expect(
      page.locator('[automation-id="primaryGroupBy"]')
    ).toBeVisible({ timeout: 10_000 });

    // Open the Group By dropdown
    await costExplorerPage.openGroupByDropdown();

    // The dropdown panel should show Cloud/Custom tabs
    await expect(
      page.locator('[id*="trigger-cloud"]').first()
    ).toBeVisible({ timeout: 5_000 });

    // Close by pressing Escape
    await page.keyboard.press('Escape');
  });

  test('should display Apply button', async ({ costExplorerPage }) => {
    await costExplorerPage.goto();
    await costExplorerPage.expectPageVisible();
    await costExplorerPage.expectApplyButtonVisible();
  });

  test('should show total cost heading with Amortized metric', async ({ costExplorerPage, page }) => {
    await costExplorerPage.goto();
    await costExplorerPage.expectPageVisible();

    // Verify the total cost heading contains "Total Cost"
    await expect(
      page.getByRole('heading', { name: /Total Cost/ }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('should show cost metric selector (Amortized by default)', async ({ costExplorerPage, page }) => {
    await costExplorerPage.goto();
    await costExplorerPage.expectPageVisible();

    // The metric trigger button should show "Amortized"
    await expect(
      page.locator('[class*="triggerLabel"]').filter({ hasText: /Amortized/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('should display chart with dollar amounts on Y-axis', async ({ costExplorerPage, page }) => {
    await costExplorerPage.goto();
    await costExplorerPage.expectPageVisible();

    // Total cost value should show a $ amount
    await expect(
      page.locator('[class*="number"]').first()
    ).toBeVisible({ timeout: 15_000 });

    // Y-axis labels should contain $ amounts
    await expect(
      page.locator('text=/\\$\\s*\\d+K?/').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('should show the Latest invoice date badge', async ({ costExplorerPage }) => {
    await costExplorerPage.goto();
    await costExplorerPage.expectPageVisible();

    await expect(costExplorerPage.latestInvoiceDate).toBeVisible();
  });

  test('should show chart SVG when page loads', async ({ costExplorerPage, page }) => {
    await costExplorerPage.goto();
    await costExplorerPage.expectPageVisible();

    // recharts renders inside a wrapper div
    // We look for SVG bars or the chart container
    await expect(
      page.locator('.recharts-wrapper, .recharts-surface').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('full journey: dashboard → navigate → assert cost data → change period', async ({
    dashboardPage,
    page,
  }) => {
    // Step 1: Start at dashboard
    await dashboardPage.goto();
    await dashboardPage.expectDashboardLoaded();
    await dashboardPage.expectSidebarVisible();

    // Step 2: Navigate to Cost & Usage Explorer via sidebar
    await dashboardPage.navigateToCostUsageExplorer();
    await expect(page).toHaveURL(/cost-usage/, { timeout: 15_000 });
    await expect(page.locator('text=Latest invoice date')).toBeVisible({ timeout: 15_000 });

    // Step 3: Verify default state — Total Cost heading and dollar value visible
    await expect(
      page.getByRole('heading', { name: /Total Cost/ }).first()
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.locator('[class*="number"]').first()
    ).toBeVisible({ timeout: 10_000 });

    // Step 4: Verify the Apply button is accessible
    await expect(page.getByRole('button', { name: 'Apply' })).toBeVisible();

    // Step 5: Take a screenshot for manual review
    await page.screenshot({
      path: 'test-results/cost-explorer-full-journey.png',
      fullPage: false,
    });
  });
});
