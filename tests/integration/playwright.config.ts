import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 60 * 1000, // 60 seconds
  webServer: [
    {
      name: 'api',
      command: 'npx tsx server/server.ts',
      url: 'http://localhost:3001/health-check',
      reuseExistingServer: true,
    },
  ],
  testMatch: '**/*.spec.ts',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
