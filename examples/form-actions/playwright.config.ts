import { devices } from '@playwright/test';
import { createPlaywrightConfig } from '@tramvai/test-pw';

export default createPlaywrightConfig({
  testDir: './__integration__',
  testMatch: /.*\.(integration|test|spec)\.(js|ts)/,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
