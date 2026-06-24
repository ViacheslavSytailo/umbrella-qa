import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/** Credentials & URLs used across the test suite. */
export const testConfig = {
  baseUrl: process.env.BASE_URL || 'https://dev.umbrellacost.dev',
  apiBaseUrl: process.env.API_BASE_URL || 'https://api.dev.umbrellacost.dev',
  user: {
    email: process.env.USER_EMAIL || '',
    password: process.env.USER_PASSWORD || '',
  },
} as const;

/** Invalid credentials for negative auth tests. */
export const invalidCredentials = {
  wrongEmail: {
    email: 'nonexistent.user@test-invalid.com',
    password: 'SomePassword123!',
  },
  wrongPassword: {
    email: testConfig.user.email,
    password: 'WrongPassword999!',
  },
  emptyEmail: {
    email: '',
    password: testConfig.user.password,
  },
  emptyPassword: {
    email: testConfig.user.email,
    password: '',
  },
  malformedEmail: {
    email: 'not-an-email',
    password: testConfig.user.password,
  },
} as const;

/** Known navigation paths in the Umbrella platform. */
export const routes = {
  login: '/login',
  dashboard: '/',
  costUsageExplorer: '/cost-usage/cost-usage-explorer',
  account: '/account',
} as const;

/** Known API endpoint paths (relative to API base). */
export const apiEndpoints = {
  signinWithToken: '/api/v1/users/signin-with-token',
  roles: '/api/v1/users/roles',
  subUsers: '/api/v1/users/sub',
  userAccounts: '/api/v1/users/user-accounts',
  accountInfo: '/api/v1/users/account-info',
  preferences: '/api/v1/users/preferences',
  linkedAccounts: '/api/v1/users/linked-accounts',
  userManagementUsers: '/api/v1/user-management/users',
  userManagementAccounts: '/api/v1/user-management/accounts',
  divisions: '/api/v1/divisions',
  budgets: '/api/v1/budgets',
  serviceCosts: '/api/v1/invoices/service-costs/distinct',
  metrics: '/api/v1/invoices/metrics',
  metricTypes: '/api/v1/invoices/metrics/types',
  forecastDaily: '/api/v1/dashboards/forecast-dashboard-data/daily',
  forecastMonthly: '/api/v1/dashboards/forecast-dashboard-data/monthly',
  signout: '/api/v1/users/signout',
} as const;
