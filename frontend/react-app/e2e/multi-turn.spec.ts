import { test, expect } from "@playwright/test";

// Helper: build an ADK SSE event
function adkEvent(content: {
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
  functionResponse?: { name: string; response: Record<string, unknown>; id?: string };
  text?: string;
}) {
  return `data: ${JSON.stringify({ content: { parts: [content], role: content.functionResponse ? "user" : "model" }, author: "gen_analytics", actions: { stateDelta: {}, artifactDelta: {} } })}\n\n`;
}

test.describe("Multi-Turn Conversations", () => {
  test("Follow-up query renders as second message in same session", async ({ page }) => {
    let callCount = 0;

    await page.route(/\/apps\/gen_analytics\/users\/web_user\/sessions/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "session-multi-1" }),
      });
    });

    await page.route(/\/run_sse/, async (route) => {
      callCount++;
      let events: string;

      if (callCount === 1) {
        // Turn 1: count query
        events =
          adkEvent({ functionCall: { name: "validate_sql", args: { sql: "SELECT COUNT(*) as cnt FROM payouts" }, id: "fc-1" } }) +
          adkEvent({ functionResponse: { name: "validate_sql", response: { is_valid: true, errors: [], estimated_bytes: 50000000, estimated_cost_usd: 0.0003, requires_approval: false }, id: "fc-1" } }) +
          adkEvent({ functionCall: { name: "execute_sql", args: { sql: "SELECT COUNT(*) as cnt FROM payouts" }, id: "fc-2" } }) +
          adkEvent({ functionResponse: { name: "execute_sql", response: { columns: ["cnt"], rows: [{ cnt: 1500000 }], total_rows: 1, bytes_processed: 30000000 }, id: "fc-2" } }) +
          adkEvent({ text: "There were 1,500,000 payouts last week." });
      } else {
        // Turn 2: follow-up with GROUP BY
        events =
          adkEvent({ functionCall: { name: "validate_sql", args: { sql: "SELECT status, COUNT(*) as cnt FROM payouts GROUP BY status" }, id: "fc-3" } }) +
          adkEvent({ functionResponse: { name: "validate_sql", response: { is_valid: true, errors: [], estimated_bytes: 50000000, estimated_cost_usd: 0.0003, requires_approval: false }, id: "fc-3" } }) +
          adkEvent({ functionCall: { name: "execute_sql", args: { sql: "SELECT status, COUNT(*) as cnt FROM payouts GROUP BY status" }, id: "fc-4" } }) +
          adkEvent({ functionResponse: { name: "execute_sql", response: { columns: ["status", "cnt"], rows: [{ status: "success", cnt: 1400000 }, { status: "failed", cnt: 100000 }], total_rows: 2, bytes_processed: 30000000 }, id: "fc-4" } }) +
          adkEvent({ text: "Here's the breakdown by status." });
      }

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "Cache-Control": "no-cache" },
        body: events,
      });
    });

    await page.route("**/api/v1/saved-queries", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Turn 1
    await page.locator("textarea").fill("How many payouts last week?");
    await page.locator("button", { has: page.locator("svg") }).last().click();
    await page.waitForTimeout(2000);

    await expect(page.getByText("1,500,000 payouts")).toBeVisible();

    // Turn 2 — follow-up
    await page.locator("textarea").fill("Break that down by status");
    await page.locator("button", { has: page.locator("svg") }).last().click();
    await page.waitForTimeout(2000);

    await expect(page.getByText("breakdown by status")).toBeVisible();

    // Both messages in sidebar
    await expect(page.getByText("1. How many payouts last week?")).toBeVisible();
    await expect(page.getByText("2. Break that down by status")).toBeVisible();

    // Session was reused (only 1 session create call)
    expect(callCount).toBe(2); // 2 run_sse calls, same session

    await page.screenshot({ path: "e2e/results/multi-turn-follow-up.png", fullPage: true });
  });

  test("Clear Session creates a new ADK session", async ({ page }) => {
    let sessionCreateCount = 0;

    await page.route(/\/apps\/gen_analytics\/users\/web_user\/sessions/, async (route) => {
      sessionCreateCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: `session-clear-${sessionCreateCount}` }),
      });
    });

    await page.route(/\/run_sse/, async (route) => {
      const events = adkEvent({ text: "Some response." });
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "Cache-Control": "no-cache" },
        body: events,
      });
    });

    await page.route("**/api/v1/saved-queries", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Submit a query (creates session 1)
    await page.locator("textarea").fill("First query");
    await page.locator("button", { has: page.locator("svg") }).last().click();
    await page.waitForTimeout(1500);

    expect(sessionCreateCount).toBe(1);

    // Clear session
    await page.getByText("Clear Session").click();
    await page.waitForTimeout(500);

    // Messages should be cleared
    await expect(page.getByText("What would you like to know")).toBeVisible();

    // Submit another query (should create session 2)
    await page.locator("textarea").fill("Second query after clear");
    await page.locator("button", { has: page.locator("svg") }).last().click();
    await page.waitForTimeout(1500);

    // Should have created a NEW session
    expect(sessionCreateCount).toBe(2);

    await page.screenshot({ path: "e2e/results/multi-turn-clear-session.png", fullPage: true });
  });
});
