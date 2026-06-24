# Umbrella FinOps – QA Automation Test Suite

Playwright E2E test project for the [Umbrella FinOps platform](https://dev.umbrellacost.dev) covering both **API** and **UI** test suites.

---

## Quick Start

```bash
# 1. Clone & install
git clone <repo-url>
cd umbrella-qa
npm install

# 2. Install Playwright browsers
npx playwright install --with-deps chromium

# 3. Set up credentials
cp .env.example .env
# Edit .env with your credentials (see .env.example)

# 4. Run all tests
npm test
```

**Result:** 38 tests — 1 auth setup + 26 API + 11 UI — all green.

---

## Project Structure

```
umbrella-qa/
├── playwright.config.ts          # Playwright configuration (projects, reporters)
├── .env.example                  # Environment variable template
├── .github/workflows/
│   └── playwright.yml            # GitHub Actions CI with 2-shard matrix
├── src/
│   ├── pages/                    # Page Object Model
│   │   ├── login.page.ts         # Two-step login (email → Next → password → Sign In)
│   │   ├── dashboard.page.ts     # Main dashboard & sidebar navigation
│   │   └── cost-explorer.page.ts # Cost & Usage Explorer controls
│   ├── fixtures/
│   │   └── base.fixture.ts       # Custom fixtures (POM, API client, error collectors)
│   ├── helpers/
│   │   └── api-client.ts         # Typed API client wrapper with correct auth headers
│   └── data/
│       └── test-data.ts          # Centralized config, routes, endpoints
└── tests/
    ├── auth.setup.ts             # UI login → JWT + apikey extraction → saves storageState
    ├── api/
    │   ├── auth.api.spec.ts      # Authentication: signin-with-token, JWT validation, negative cases
    │   ├── whoami.api.spec.ts    # User identity: roles, preferences, divisions, sub-users
    │   └── api-keys.api.spec.ts  # API key structure + account access + RBAC negative cases
    └── ui/
        └── cost-usage-explorer.ui.spec.ts  # Full Cost & Usage E2E journey (11 tests)
```

---

## Test Suites

### API Suite (26 tests)

| File | Coverage |
|---|---|
| `auth.api.spec.ts` | signin-with-token, JWT structure/expiry, user roles, sub-users, linked accounts, **negative**: no token, bad token, 404 |
| `whoami.api.spec.ts` | User identity verification, email match, notification settings, divisions, on-boarding, plain-sub-users |
| `api-keys.api.spec.ts` | apikey format validation, userId/JWT sub match, account access with apikey, **negative**: no auth, no apikey, admin endpoint, missing fields |

### UI Suite (11 tests)

| File | Coverage |
|---|---|
| `cost-usage-explorer.ui.spec.ts` | Dashboard load → sidebar nav → Cost Explorer page, Group By dropdown, Apply button, Total Cost heading, cost metric selector (Amortized), chart with dollar amounts, Latest invoice date, chart SVG, full E2E journey |

---

## Available Commands

```bash
npm test                  # Run all tests (auth-setup → API → UI)
npm run test:api          # API tests only
npm run test:ui           # UI tests only
npm run test:auth         # Auth setup only
npm run test:headed       # Run with browser visible
npm run test:debug        # Debug mode with Playwright Inspector
npm run report            # Open HTML report
npm run allure:generate   # Generate Allure report
npm run allure:open       # Open Allure report
```

---

## Design Choices

### Auth Strategy

The platform uses **AWS Cognito** for auth with a separate API server at `api.dev.umbrellacost.dev`. Auth setup:

1. Logs in via UI (real browser, two-step: email → password)
2. Waits for a real API request to fire, capturing the `apikey` header
3. Also extracts JWT and user IDs from localStorage
4. Saves browser `storageState` for UI tests and a `token.json` for API tests

**Key discovery:** the API gateway requires two headers on every request:
- `Authorization: <Cognito ID token>` — the JWT
- `apikey: <userId>:<accountId>:<divisionId>` — a routing/identity key

Without `apikey`, requests time out at the gateway (not 401/403). This was discovered by capturing real browser network traffic with Playwright's request interceptor.

### API Test Strategy

API tests use Playwright's `APIRequestContext` (server-side) — no browser, no CORS. Both `Authorization` and `apikey` headers are read from `playwright/.auth/token.json` written by auth setup.

The `ApiClient` helper class encapsulates the correct header set so tests stay clean.

**API key scheme discovery:** The platform has no user-managed CRUD endpoint for API keys (verified by full JS bundle analysis — 213 endpoints — live network capture across all account/settings pages, and direct probing of candidate endpoints like `/users/renewToken`). The platform uses a server-generated composite key `userId:accountId:divisionId` stored in localStorage at sign-in. `api-keys.api.spec.ts` tests this generation flow: key is present after auth, structurally valid, bound to the JWT identity, and grants access to protected resources.

### UI Test Strategy

**Page Object Model** with stable selectors:
- Sidebar: `#sideBarItemButton-<name>`, `#innerSideBarItemButton-<name>` — stable id attributes
- Group By: `[automation-id="primaryGroupBy"]` — custom automation attribute
- Cost metric: `[class*="triggerLabel"]` filtered by text content
- Chart: `.recharts-wrapper`, `.recharts-surface`

Navigation uses `waitUntil: 'domcontentloaded'` + element-level waits rather than `networkidle` — the SPA keeps polling, so `networkidle` never fires reliably.

### Configuration

- Credentials in `.env` (gitignored), `.env.example` as template
- All URLs and API endpoints centralized in `src/data/test-data.ts`
- TypeScript throughout

---

## AI Tools Used

- **Kiro (Claude)** — Architecture design, API discovery by capturing browser network traffic, fixing strict-mode violations in selectors, debugging auth header requirements
- **Antigravity** — Initial browser exploration and page structure discovery (earlier iteration)

---

## What Was Verified Manually

1. ✅ Login flow on `https://dev.umbrellacost.dev/login` — two-step: email → Next → password → Sign In
2. ✅ Dashboard renders with Welcome banner and cost widgets
3. ✅ Sidebar navigation to Cost & Usage Explorer
4. ✅ Cost Explorer controls: Group By dropdown (Cloud/Custom/K8s tabs), Apply button, Amortized metric selector, date range
5. ✅ Chart renders with stacked bars and Y-axis dollar amounts
6. ✅ API requires both `Authorization` (Cognito JWT) and `apikey` (userId:accountId:divisionId) headers
7. ✅ 36 unique API endpoints discovered from browser traffic analysis

---

## Known Limitations

1. **Shared test account:** Tests avoid creating/modifying data that could affect other users.
2. **Token expiry:** Cognito ID tokens expire after ~24h. The auth setup project regenerates them on every run. If running `--no-deps`, ensure `playwright/.auth/token.json` is fresh.
3. **API key CRUD:** The platform has no user-managed API key CRUD — confirmed by JS bundle analysis (213 endpoints), live network capture, and direct API probing. The `apikey` header is a server-generated composite key (`userId:accountId:divisionId`) assigned at sign-in. The `api-keys.api.spec.ts` suite tests this generation flow.
4. **Dynamic class names:** The app uses CSS modules. Selectors fall back to `automation-id`, stable `id` attributes, and semantic role/text queries.

---

## Bonus Features Implemented

- ✅ **Allure reporting** — `allure-playwright` reporter configured
- ✅ **CI workflow** — GitHub Actions with 2-shard matrix + merge-reports job
- ✅ **Console / network error fixture** — Captures console errors and 4xx/5xx responses
- ✅ **API-driven UI setup** — JWT and apikey from UI login reused for all API tests
- ✅ **RBAC negative tests** — Admin endpoint (403/404/405), missing auth (401/403)
- ✅ **Sharding** — `--shard` flag used in CI matrix
- ✅ **Teardown** — auth tokens regenerated on each run; no persistent test data created

---

## Security

- Credentials are stored in `.env` (gitignored)
- `.env.example` contains only placeholder values
- CI uses GitHub Secrets for credential injection
- `playwright/.auth/` is gitignored — no tokens committed
