import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:5174",
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview",
    wait: { stdout: /Local:/ },
    timeout: 30000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 3000 },
  },
  reporter: "list",
});
