import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  reporter: "list",
});
