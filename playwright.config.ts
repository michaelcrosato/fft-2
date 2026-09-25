// Cross-browser / mobile end-to-end checks (`npm run test:e2e`).
// Runs the production build (vite preview) in Chromium, Firefox and WebKit (Safari's engine)
// on desktop, phone, landscape-phone, small-phone and tablet profiles.
// Headless browsers render with software GL, so frame rates are low and timeouts generous.
// Real iOS Safari can't run here; the WebKit iPhone/iPad profiles are the closest automated check.
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e-results',
  timeout: 180_000,
  expect: { timeout: 60_000 },
  fullyParallel: true,
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'e2e-report', open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npx vite build --logLevel warn && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    // desktop
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 720 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 720 } } },
    // phones & tablets, each in the engine it ships with
    { name: 'mobile-chrome', use: { ...devices['Pixel 10'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 17 Pro'] } },
    { name: 'small-phone', use: { ...devices['iPhone SE (3rd gen)'] } },
    { name: 'phone-landscape', use: { ...devices['iPhone 17 landscape'] } },
    { name: 'tablet', use: { ...devices['iPad Pro 11 landscape'] } },
  ],
});
