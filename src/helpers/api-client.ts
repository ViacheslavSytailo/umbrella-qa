import { APIRequestContext } from '@playwright/test';

/**
 * Lightweight wrapper around Playwright's APIRequestContext
 * for authenticated calls to the Umbrella backend.
 *
 * The Umbrella API gateway requires three headers on every request:
 *   - Authorization: <Cognito ID token>
 *   - apikey: <userId>:<accountId>:<divisionId>
 *   - commonparams: {"isPpApplied":false}
 *   - Referer: https://dev.umbrellacost.dev/
 *
 * These are extracted during auth setup and stored in playwright/.auth/token.json.
 */
export class ApiClient {
  private readonly baseApiUrl: string;
  private authToken: string = '';
  private apiKey: string = '';

  constructor(
    private readonly request: APIRequestContext,
    baseApiUrl?: string,
  ) {
    this.baseApiUrl = baseApiUrl || process.env.API_BASE_URL || 'https://api.dev.umbrellacost.dev';
  }

  /** Inject auth credentials (token + apiKey) */
  setAuth(authToken: string, apiKey: string): void {
    this.authToken = authToken;
    this.apiKey = apiKey;
  }

  /** @deprecated Use setAuth instead */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      accept: 'application/json, text/plain, */*',
      Referer: 'https://dev.umbrellacost.dev/',
      commonparams: JSON.stringify({ isPpApplied: false }),
    };
    if (this.authToken) headers['Authorization'] = this.authToken;
    if (this.apiKey) headers['apikey'] = this.apiKey;
    return headers;
  }

  // ─── Users ────────────────────────────────────────────

  async signinWithToken(body?: Record<string, unknown>) {
    return this.request.post(`${this.baseApiUrl}/api/v1/users/signin-with-token`, {
      headers: this.authHeaders(),
      data: body ?? {},
    });
  }

  async getUserRoles() {
    return this.request.get(`${this.baseApiUrl}/api/v1/users/roles`, {
      headers: this.authHeaders(),
    });
  }

  async getSubUsers() {
    return this.request.get(`${this.baseApiUrl}/api/v1/users/sub`, {
      headers: this.authHeaders(),
    });
  }

  async getPlainSubUsers() {
    return this.request.get(`${this.baseApiUrl}/api/v1/users/plain-sub-users`, {
      headers: this.authHeaders(),
    });
  }

  async getUserAccounts() {
    return this.request.get(`${this.baseApiUrl}/api/v1/users/user-accounts`, {
      headers: this.authHeaders(),
    });
  }

  async getAccountInfo() {
    return this.request.get(`${this.baseApiUrl}/api/v1/users/account-info`, {
      headers: this.authHeaders(),
    });
  }

  async getUserPreferences() {
    return this.request.get(`${this.baseApiUrl}/api/v1/users/preferences`, {
      headers: this.authHeaders(),
    });
  }

  async getLinkedAccounts() {
    return this.request.get(`${this.baseApiUrl}/api/v1/users/linked-accounts`, {
      headers: this.authHeaders(),
    });
  }

  async getUserNotificationSettings() {
    return this.request.get(`${this.baseApiUrl}/api/v1/users/user-settings/notifications`, {
      headers: this.authHeaders(),
    });
  }

  // ─── User Management ─────────────────────────────────

  async getUserManagementUsers() {
    return this.request.get(`${this.baseApiUrl}/api/v1/user-management/users`, {
      headers: this.authHeaders(),
    });
  }

  async getUserManagementAccounts() {
    return this.request.get(`${this.baseApiUrl}/api/v1/user-management/accounts`, {
      headers: this.authHeaders(),
    });
  }

  // ─── API Keys ─────────────────────────────────────────

  async listApiKeys() {
    return this.request.get(`${this.baseApiUrl}/api/v1/users/apikeys`, {
      headers: this.authHeaders(),
    });
  }

  async createApiKey(name: string) {
    return this.request.post(`${this.baseApiUrl}/api/v1/users/apikeys`, {
      headers: this.authHeaders(),
      data: { name },
    });
  }

  async deleteApiKey(keyId: string) {
    return this.request.delete(`${this.baseApiUrl}/api/v1/users/apikeys/${keyId}`, {
      headers: this.authHeaders(),
    });
  }

  // ─── Divisions / Customers ────────────────────────────

  async getDivisions() {
    return this.request.get(`${this.baseApiUrl}/api/v1/divisions`, {
      headers: this.authHeaders(),
    });
  }

  async getDivisionsCustomers() {
    return this.request.get(`${this.baseApiUrl}/api/v1/divisions/customers`, {
      headers: this.authHeaders(),
    });
  }

  // ─── Cost & Usage ─────────────────────────────────────

  async getCostAndUsage(params: Record<string, string>) {
    return this.request.get(`${this.baseApiUrl}/api/v1/invoices/service-costs/distinct`, {
      headers: this.authHeaders(),
      params,
    });
  }

  async getServiceNames() {
    return this.request.get(`${this.baseApiUrl}/api/v1/invoices/service-names/distinct`, {
      headers: this.authHeaders(),
    });
  }

  async getMetrics() {
    return this.request.get(`${this.baseApiUrl}/api/v1/invoices/metrics`, {
      headers: this.authHeaders(),
    });
  }

  async getMetricTypes() {
    return this.request.get(`${this.baseApiUrl}/api/v1/invoices/metrics/types`, {
      headers: this.authHeaders(),
    });
  }

  // ─── Budgets ──────────────────────────────────────────

  async getBudgets() {
    return this.request.get(`${this.baseApiUrl}/api/v1/budgets`, {
      headers: this.authHeaders(),
    });
  }

  // ─── Dashboards / Forecast ────────────────────────────

  async getForecastDaily() {
    return this.request.get(`${this.baseApiUrl}/api/v1/dashboards/forecast-dashboard-data/daily`, {
      headers: this.authHeaders(),
    });
  }

  async getForecastMonthly() {
    return this.request.get(
      `${this.baseApiUrl}/api/v1/dashboards/forecast-dashboard-data/monthly`,
      { headers: this.authHeaders() },
    );
  }

  // ─── Generic request helpers (for edge-case tests) ────

  async get(
    path: string,
    options?: { headers?: Record<string, string>; params?: Record<string, string> },
  ) {
    return this.request.get(`${this.baseApiUrl}${path}`, {
      headers: { ...this.authHeaders(), ...options?.headers },
      params: options?.params,
    });
  }

  async post(
    path: string,
    options?: { headers?: Record<string, string>; data?: unknown },
  ) {
    return this.request.post(`${this.baseApiUrl}${path}`, {
      headers: { ...this.authHeaders(), ...options?.headers },
      data: options?.data,
    });
  }

  async put(
    path: string,
    options?: { headers?: Record<string, string>; data?: unknown },
  ) {
    return this.request.put(`${this.baseApiUrl}${path}`, {
      headers: { ...this.authHeaders(), ...options?.headers },
      data: options?.data,
    });
  }

  async delete(path: string, options?: { headers?: Record<string, string> }) {
    return this.request.delete(`${this.baseApiUrl}${path}`, {
      headers: { ...this.authHeaders(), ...options?.headers },
    });
  }
}
