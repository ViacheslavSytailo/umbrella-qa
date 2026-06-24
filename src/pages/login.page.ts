import { type Page, type Locator, expect } from '@playwright/test';

/**
 * LoginPage – Page Object for /login.
 *
 * The Umbrella login flow is **two-step**:
 *   Step 1 → Enter email, click "Next"
 *   Step 2 → Enter password, click "Login" / "Sign In"
 */
export class LoginPage {
  readonly page: Page;

  // ── Step 1: Email ─────────────────────────────────────
  readonly emailInput: Locator;
  readonly nextButton: Locator;

  // ── Step 2: Password ──────────────────────────────────
  readonly passwordInput: Locator;
  readonly signInButton: Locator;

  // ── Common ────────────────────────────────────────────
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly umbrellaLogo: Locator;

  constructor(page: Page) {
    this.page = page;

    // Step 1
    this.emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i], input[type="text"]').first();
    this.nextButton = page.locator('button:has-text("Next")');

    // Step 2
    this.passwordInput = page.locator('input[type="password"]');
    this.signInButton = page.locator('button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login"), button[type="submit"]');

    // Common
    this.errorMessage = page.locator('[role="alert"], .error-message, .MuiAlert-message, text=/incorrect|invalid|wrong|error/i');
    this.forgotPasswordLink = page.locator('a:has-text("Forgot"), a:has-text("forgot")');
    this.umbrellaLogo = page.locator('text=umbrella, img[alt*="umbrella" i]').first();
  }

  // ── Actions ───────────────────────────────────────────

  async goto() {
    // The SPA never fires the 'load' event (it keeps a connection open), so we
    // navigate on 'domcontentloaded' and wait for the email field element instead.
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
    await this.emailInput.waitFor({ state: 'visible', timeout: 30_000 });
  }

  /** Step 1: enter email and click Next */
  async enterEmailAndNext(email: string) {
    await this.emailInput.waitFor({ state: 'visible', timeout: 15_000 });
    await this.emailInput.fill(email);
    await this.nextButton.click();
  }

  /** Step 2: enter password and click Sign In */
  async enterPasswordAndSignIn(password: string) {
    await this.passwordInput.waitFor({ state: 'visible', timeout: 15_000 });
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  /** Full two-step login flow */
  async login(email: string, password: string) {
    await this.enterEmailAndNext(email);
    await this.enterPasswordAndSignIn(password);
  }

  /** Full login + wait for dashboard redirect */
  async loginAndWaitForDashboard(email: string, password: string) {
    await this.login(email, password);
    // Wait until we navigate away from /login. We don't wait for 'networkidle' —
    // the SPA polls continuously, so the caller asserts on a dashboard element instead.
    await this.page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 30_000,
    });
  }

  // ── Assertions ────────────────────────────────────────

  async expectLoginPageVisible() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.nextButton).toBeVisible();
  }

  async expectPasswordStepVisible() {
    await expect(this.passwordInput).toBeVisible();
    await expect(this.signInButton).toBeVisible();
  }

  async expectErrorVisible() {
    await expect(this.errorMessage.first()).toBeVisible({ timeout: 10_000 });
  }
}
