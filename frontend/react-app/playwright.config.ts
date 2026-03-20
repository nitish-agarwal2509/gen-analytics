import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/results",
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "on",
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  // Don't start servers — we run them separately
  webServer: undefined,
});
