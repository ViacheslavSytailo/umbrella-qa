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

**Result:** 26 tests — 1 auth setup + 13 API + 12 UI — all green.

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
│   │   └── base.fixture.ts       # Custom fixtures (page objects + network error collector)
│   ├── helpers/
│   │   ├── api-client.ts         # Typed API client wrapper with correct auth headers
│   │   └── read-auth.ts          # Shared helper to read token.json in API specs
│   └── data/
│       └── test-data.ts          # Centralized base URLs + credentials
└── tests/
    ├── auth.setup.ts             # UI login → JWT + apikey extraction → saves storageState
    ├── api/
    │   ├── auth.api.spec.ts      # Authentication: signin-with-token, JWT validation, negative cases
    │   ├── whoami.api.spec.ts    # User identity: roles, preferences, divisions, sub-users
    │   └── api-keys.api.spec.ts  # apikey structure + identity binding + auth-boundary negative
    └── ui/
        └── cost-usage-explorer.ui.spec.ts  # Full Cost & Usage E2E journey (12 tests)
```

---

## Test Suites

### API Suite (13 tests)

| File | Coverage |
|---|---|
| `auth.api.spec.ts` | signin-with-token, JWT structure/expiry validation, **negative**: no token, malformed JWT, non-existent endpoint (404) |
| `whoami.api.spec.ts` | User identity (email + `userKey` binding), roles bound to the authenticated user/account (`userKey`/`accountKey` match the apikey), sub-users list, **negative**: unauthenticated request |
| `api-keys.api.spec.ts` | apikey format (userId:accountId:divisionId), userId↔JWT `sub` binding, access granted with apikey, **negative**: protected endpoint rejects unauthenticated request |

### UI Suite (12 tests)

| File | Coverage |
|---|---|
| `cost-usage-explorer.ui.spec.ts` | Dashboard load → sidebar nav → Cost Explorer page, Group By dropdown, Apply button, Total Cost heading, cost metric selector (Amortized), chart with dollar amounts, Latest invoice date, chart SVG, 5xx network error assertion, full E2E journey |

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

This was found by inspecting the network requests the app makes after login (DevTools, then reproduced with Playwright's request interceptor in `auth.setup.ts`). Without `apikey`, authenticated calls do not succeed.

### API Test Strategy

API tests use Playwright's `APIRequestContext` (server-side) — no browser, no CORS. Both `Authorization` and `apikey` headers are read from `playwright/.auth/token.json` written by auth setup.

The `ApiClient` helper class encapsulates the correct header set so tests stay clean. Auth credentials are read once in `beforeAll` via `readAuthData()` (shared across all three spec files) and injected via `client.setAuth()`. Each spec creates its own `APIRequestContext` via `request.newContext()` and disposes it in `afterAll` — the pattern Playwright requires for shared contexts across a `describe` block.

**On the "API-key generation flow":** The `apikey` the platform sends with every request is a composite value `userId:accountId:divisionId`, assembled at sign-in and stored in `localStorage`. I checked all **Account** tabs (Cloud Accounts / Roles & Users / Linked Accounts / Settings) and the user-avatar menu — there is **no managed "create API key" feature** in the product (Settings → Policies is AWS IAM onboarding JSON, unrelated). So I interpreted "API-key generation flow" as *the key generated for the session at login*. `api-keys.api.spec.ts` verifies that key: present after auth, structurally valid (`userId:accountId:divisionId`), bound to the JWT `sub` claim (identity binding), and grants access to a protected endpoint.

> ⚠️ This is an interpretation. If a managed API-key endpoint does exist (e.g. partner/admin-only, not in this UI), the suite should be extended to cover create → use → revoke.

### UI Test Strategy

**Page Object Model** with stable selectors:
- Sidebar: `#sideBarItemButton-<name>`, `#innerSideBarItemButton-<name>` — stable id attributes
- Group By: `[automation-id="primaryGroupBy"]` — custom automation attribute
- Cost metric: `[class*="triggerLabel"]` filtered by text content
- Chart: `.recharts-wrapper`, `.recharts-surface`

Navigation uses `waitUntil: 'domcontentloaded'` + element-level waits rather than `networkidle` — the SPA keeps polling, so `networkidle` never fires reliably.

### Configuration

- Credentials in `.env` (gitignored), `.env.example` as template
- Base URLs and credentials centralized in `src/data/test-data.ts`
- TypeScript throughout

---

## AI Tools Used

This project was built with heavy AI assistance, used iteratively:

- **Antigravity** — initial browser exploration and page-structure discovery
- **Kiro (Claude)** — scaffolding the Playwright project, page objects, and first test drafts
- **Claude Code** — refactoring toward the current structure, removing dead code, fixing the auth/API-context handling, and stabilizing flaky waits

I drove the design decisions and verified behaviour against the live site (see below); the AI tools generated and refactored the code.

---

## What Was Verified Manually

1. ✅ Login flow on `https://dev.umbrellacost.dev/login` — two-step: email → Next → password → Sign In
2. ✅ Dashboard renders with a Welcome banner and cost widgets
3. ✅ Sidebar navigation to Cost & Usage Explorer
4. ✅ Cost Explorer renders: Group By control, Apply button, Amortized metric, Total Cost value, chart with Y-axis dollar amounts
5. ✅ API requires both `Authorization` (Cognito JWT) and `apikey` (`userId:accountId:divisionId`) headers — observed in DevTools and reproduced in `auth.setup.ts`
6. ✅ Looked for a managed API-key feature — checked all **Account** tabs (Cloud Accounts / Roles & Users / Linked Accounts / Settings → Policies) and the user-avatar menu; none exists. "Settings → Policies" is AWS IAM onboarding JSON, not Umbrella API keys.
7. ✅ The product has an RBAC model (**Admin / Editor / Viewer** under *Roles & Users*); the test account holds the *Editor* role. The `/users/roles` response was inspected directly and its `userKey`/`accountKey` confirmed to bind to the session apikey — which the roles test now asserts.
8. ✅ Full suite run against the live site: **13 API + 12 UI (+1 auth-setup) green** (local + CI)

---

## Known Limitations

1. **Shared test account:** Tests avoid creating/modifying data that could affect other users.
2. **Token expiry:** Cognito ID tokens expire after ~24h. The auth setup project regenerates them on every run. If running `--no-deps`, ensure `playwright/.auth/token.json` is fresh.
3. **API-key interpretation:** I did not find a user-facing "create API key" flow in the time available, so the API-key suite tests the composite session key (`userId:accountId:divisionId`) rather than a CRUD lifecycle. If a managed API-key feature exists, this is the first thing I'd extend. (See *API Test Strategy*.)
4. **RBAC:** The product *does* have roles (Admin / Editor / Viewer), but I only have one set of credentials (an *Editor*). A true cross-role test (e.g. Viewer is denied a write) needs a second, lower-privilege login I don't have, so the suite covers the authentication boundary (protected endpoint rejects unauthenticated requests with 401) plus role-identity binding in the roles test. I deliberately removed an earlier "admin endpoint" test that accepted `404` — it passed even though `/admin/accounts` doesn't exist, so it wasn't actually testing authorization.
5. **Dynamic class names:** The app uses CSS modules. Selectors fall back to `automation-id`, stable `id` attributes, and semantic role/text queries.

---

## Bonus Features Implemented

- ✅ **Allure reporting** — `allure-playwright` reporter configured
- ✅ **CI workflow** — GitHub Actions with 2-shard matrix + merge-reports job
- ✅ **Network error fixture** — `networkErrors` collector asserts the Cost Explorer page produces no 5xx responses
- ✅ **Auth reuse across suites** — one UI login produces both `storageState` (UI) and `token.json` (API), consumed by every spec
- ✅ **Sharding** — `--shard` flag used in the CI matrix
- ⚠️ **RBAC negative** — only partially: covers the auth boundary (401), not cross-role authorization (no second account available — see *Known Limitations*)
- ✅ **Teardown** — auth tokens regenerated on each run; tests create no persistent data

---

## Security

- Credentials are stored in `.env` (gitignored)
- `.env.example` contains only placeholder values
- CI uses GitHub Secrets for credential injection
- `playwright/.auth/` is gitignored — no tokens committed
