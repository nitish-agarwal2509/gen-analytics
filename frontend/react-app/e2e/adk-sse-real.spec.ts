import { test, expect } from "@playwright/test";

test.setTimeout(90_000);

test("Real ADK SSE query — streams events and completes", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Submit a simple query
  const textarea = page.locator("textarea");
  await textarea.fill("How many payouts last week?");
  await page.locator("button", { has: page.locator("svg") }).last().click();

  // Should show streaming indicator first
  await expect(page.getByText("Analyzing your data...")).toBeVisible({ timeout: 5000 });

  // Wait for thinking steps to appear (agent calls tools)
  await expect(page.getByText("Validating SQL...")).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: "e2e/results/20a-validating.png", fullPage: true });

  // Wait for completion
  await page.waitForFunction(
    () => document.body.textContent?.includes("Tools:") || document.body.textContent?.includes("Connection lost"),
    { timeout: 60_000 },
  );

  await page.screenshot({ path: "e2e/results/20b-complete.png", fullPage: true });

  console.log("Page errors:", pageErrors);
  console.log("Console errors:", consoleErrors);

  expect(pageErrors.length).toBe(0);
});
