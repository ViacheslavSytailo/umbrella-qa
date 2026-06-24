import { APIRequestContext } from '@playwright/test';

/**
 * Lightweight wrapper around Playwright's APIRequestContext
 * for authenticated calls to the Umbrella backend.
 *
 * The Umbrella API gateway requires these headers on every request:
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

  /** Inject auth credentials (token + apiKey). */
  setAuth(authToken: string, apiKey: string): void {
    this.authToken = authToken;
    this.apiKey = apiKey;
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

  // ─── Named endpoints used by the suites ───────────────

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
    return this.request.get(`${this.baseApiUrl}/api/v1/users/subUsers`, {
      headers: this.authHeaders(),
    });
  }
}
