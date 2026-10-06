import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { authDir, baseURL, apiURL } from './helpers/env';

const managerState = path.join(authDir, 'manager.json');
const headState = path.join(authDir, 'head.json');
const engineerState = path.join(authDir, 'engineer.json');
const directorState = path.join(authDir, 'director.json');
const adminState = path.join(authDir, 'admin.json');

export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'report' }]],
  outputDir: 'test-results',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
  },
  projects: [
    {
      name: 'visual-desktop',
      testMatch: /visual-login\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual-mobile',
      testMatch: /visual-login\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'visual-app-desktop',
      testMatch: /visual-app\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: managerState },
    },
    {
      name: 'visual-app-mobile',
      testMatch: /visual-app\.spec\.ts/,
      use: { ...devices['Pixel 7'], storageState: managerState },
    },
    {
      name: 'visual-lead-desktop',
      testMatch: /visual-lead-workspace\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: managerState },
    },
    {
      name: 'visual-lead-mobile',
      testMatch: /visual-lead-workspace\.spec\.ts/,
      use: { ...devices['Pixel 7'], storageState: managerState },
    },
    {
      name: 'desktop-manager',
      testMatch: /phase6-manager\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: managerState },
    },
    {
      name: 'mobile-manager',
      testMatch: /phase6-manager\.spec\.ts/,
      use: { ...devices['Pixel 7'], storageState: managerState },
    },
    {
      name: 'visual-head-desktop',
      testMatch: /visual-head-review\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: headState },
    },
    {
      name: 'visual-head-mobile',
      testMatch: /visual-head-review\.spec\.ts/,
      use: { ...devices['Pixel 7'], storageState: headState },
    },
    {
      name: 'desktop-head',
      testMatch: /phase6-head\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: headState },
    },
    {
      name: 'desktop-engineer',
      testMatch: /phase6-engineering\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: engineerState },
    },
    {
      name: 'desktop-rbac',
      testMatch: /phase6-rbac\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: engineerState },
    },
    {
      name: 'desktop-manager-rbac',
      testMatch: /phase6-manager-rbac\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: managerState },
    },
    {
      name: 'desktop-admin',
      testMatch: /phase6-admin\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: adminState },
    },
    {
      name: 'desktop-director',
      testMatch: /phase6-director\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: directorState },
    },
    {
      name: 'desktop-quote-deal',
      testMatch: /phase6-quote-deal\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: headState },
    },
    {
      name: 'isolation',
      testMatch: /auth-isolation\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  metadata: { apiURL },
});
