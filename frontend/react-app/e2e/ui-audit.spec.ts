import { test, expect } from "@playwright/test";

// Helper: build an ADK SSE event (data: {json}\n\n)
function adkEvent(content: {
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
  functionResponse?: { name: string; response: Record<string, unknown>; id?: string };
  text?: string;
}) {
  return `data: ${JSON.stringify({ content: { parts: [content], role: content.functionResponse ? "user" : "model" }, author: "gen_analytics", actions: { stateDelta: {}, artifactDelta: {} } })}\n\n`;
}

// Helper: mock the ADK backend for a test
async function mockAdk(page: import("@playwright/test").Page, events: string) {
  // Use regex to match both origins (localhost:5173 proxy and localhost:8000 direct)
  await page.route(/\/apps\/gen_analytics\/users\/web_user\/sessions/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "mock-session-1" }),
    });
  });

  await page.route(/\/run_sse/, async (route) => {
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
}

test.describe("UI Audit", () => {
  test("01 — Landing page", async ({ page }) => {
    await page.route("**/api/v1/saved-queries", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=GenAnalytics")).toBeVisible();
    await expect(page.locator("text=What would you like to know")).toBeVisible();
    await expect(page.locator("text=Session History")).toBeVisible();
    await page.screenshot({ path: "e2e/results/01-landing.png", fullPage: true });
  });

  test("02 — Dark mode toggle", async ({ page }) => {
    await page.route("**/api/v1/saved-queries", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const themeButton = page.locator("header button").first();
    await themeButton.click();
    await page.waitForTimeout(300);
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("dark");
    await page.screenshot({ path: "e2e/results/02-dark-mode.png", fullPage: true });
  });

  test("03 — Metric card query", async ({ page }) => {
    const events =
      adkEvent({ functionCall: { name: "validate_sql", args: { sql: "SELECT COUNT(*) as cnt FROM payouts" }, id: "fc-1" } }) +
      adkEvent({ functionResponse: { name: "validate_sql", response: { is_valid: true, errors: [], estimated_bytes: 50000000, estimated_cost_usd: 0.0003, requires_approval: false }, id: "fc-1" } }) +
      adkEvent({ functionCall: { name: "execute_sql", args: { sql: "SELECT COUNT(*) as cnt FROM payouts" }, id: "fc-2" } }) +
      adkEvent({ functionResponse: { name: "execute_sql", response: { columns: ["cnt"], rows: [{ cnt: 123456 }], total_rows: 1, bytes_processed: 30000000 }, id: "fc-2" } }) +
      adkEvent({ functionCall: { name: "suggest_visualization", args: { columns: ["cnt"], row_count: 1 }, id: "fc-3" } }) +
      adkEvent({ functionResponse: { name: "suggest_visualization", response: { chart_type: "metric_card", x_axis: null, y_axis: "cnt", title: "Total count", reasoning: "Single value" }, id: "fc-3" } }) +
      adkEvent({ text: "The total count is **123,456**." });

    await mockAdk(page, events);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.locator("textarea").fill("How many payouts?");
    await page.locator("button", { has: page.locator("svg") }).last().click();
    await page.waitForTimeout(2000);

    await expect(page.locator("text=SQL Query")).toBeVisible();
    await expect(page.locator(".text-3xl", { hasText: "123,456" })).toBeVisible();
    await page.screenshot({ path: "e2e/results/03-metric-card.png", fullPage: true });
  });

  test("04 — Bar chart query", async ({ page }) => {
    const events =
      adkEvent({ functionCall: { name: "validate_sql", args: { sql: "SELECT status, COUNT(*) as cnt FROM payouts GROUP BY status" }, id: "fc-1" } }) +
      adkEvent({ functionResponse: { name: "validate_sql", response: { is_valid: true, errors: [], estimated_bytes: 50000000, estimated_cost_usd: 0.0003, requires_approval: false }, id: "fc-1" } }) +
      adkEvent({ functionCall: { name: "execute_sql", args: { sql: "SELECT status, COUNT(*) as cnt FROM payouts GROUP BY status" }, id: "fc-2" } }) +
      adkEvent({ functionResponse: { name: "execute_sql", response: { columns: ["status", "cnt"], rows: [{ status: "success", cnt: 45000 }, { status: "failed", cnt: 1200 }, { status: "pending", cnt: 3400 }], total_rows: 3, bytes_processed: 30000000 }, id: "fc-2" } }) +
      adkEvent({ functionCall: { name: "suggest_visualization", args: {}, id: "fc-3" } }) +
      adkEvent({ functionResponse: { name: "suggest_visualization", response: { chart_type: "bar_chart", x_axis: "status", y_axis: "cnt", title: "Payouts by Status", reasoning: "Categorical" }, id: "fc-3" } }) +
      adkEvent({ text: "Success dominates with 45,000 transactions." });

    await mockAdk(page, events);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.locator("textarea").fill("Show payouts by status");
    await page.locator("button", { has: page.locator("svg") }).last().click();
    await page.waitForTimeout(2000);

    await expect(page.getByRole("heading", { name: "Payouts by Status" })).toBeVisible();
    await page.screenshot({ path: "e2e/results/04-bar-chart.png", fullPage: true });
  });

  test("05 — Error state", async ({ page }) => {
    const events = `data: ${JSON.stringify({ error: "Gemini rate limit reached." })}\n\n`;

    // Intercept both origins (Vite proxy and direct backend)
    await page.route(/\/apps\/gen_analytics\/users\/web_user\/sessions/, async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ id: "mock-err-session" }),
      });
    });
    await page.route(/\/run_sse/, async (route) => {
      await route.fulfill({
        status: 200, contentType: "text/event-stream",
        headers: { "Cache-Control": "no-cache" }, body: events,
      });
    });
    await page.route("**/api/v1/saved-queries", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.locator("textarea").fill("This will fail");
    await page.locator("button", { has: page.locator("svg") }).last().click();
    await page.waitForTimeout(2000);

    await expect(page.getByText("Gemini rate limit reached.")).toBeVisible();
    await page.screenshot({ path: "e2e/results/05-error.png", fullPage: true });
  });

  test("06 — Markdown table in explanation", async ({ page }) => {
    const explanation = `Here is the data:\n\n| month | count |\n|:------|:------|\n| Jan | 100 |\n| Feb | 200 |\n\n**Summary:** Counts by month.`;

    const events =
      adkEvent({ functionCall: { name: "validate_sql", args: { sql: "SELECT 1" }, id: "fc-1" } }) +
      adkEvent({ functionResponse: { name: "validate_sql", response: { is_valid: true, errors: [], estimated_bytes: 1000, estimated_cost_usd: 0.00001, requires_approval: false }, id: "fc-1" } }) +
      adkEvent({ functionCall: { name: "execute_sql", args: { sql: "SELECT 1" }, id: "fc-2" } }) +
      adkEvent({ functionResponse: { name: "execute_sql", response: { columns: ["month", "count"], rows: [{ month: "Jan", count: 100 }], total_rows: 1, bytes_processed: 500 }, id: "fc-2" } }) +
      adkEvent({ text: explanation });

    await mockAdk(page, events);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.locator("textarea").fill("Show monthly data");
    await page.locator("button", { has: page.locator("svg") }).last().click();
    await page.waitForTimeout(2000);

    // Markdown table rendered as HTML table
    await expect(page.locator("table").first()).toBeVisible();
    await expect(page.locator("strong", { hasText: "Summary:" })).toBeVisible();
    await page.screenshot({ path: "e2e/results/06-markdown.png", fullPage: true });
  });

  test("07 — SQL collapsed by default", async ({ page }) => {
    const events =
      adkEvent({ functionCall: { name: "validate_sql", args: { sql: "SELECT 1" }, id: "fc-1" } }) +
      adkEvent({ functionResponse: { name: "validate_sql", response: { is_valid: true, errors: [], estimated_bytes: 1000, estimated_cost_usd: 0.00001, requires_approval: false }, id: "fc-1" } }) +
      adkEvent({ text: "Done." });

    await mockAdk(page, events);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.locator("textarea").fill("Test");
    await page.locator("button", { has: page.locator("svg") }).last().click();
    await page.waitForTimeout(2000);

    // SQL code should NOT be visible (collapsed)
    await expect(page.locator("pre code")).not.toBeVisible();
    // But the header should be
    await expect(page.locator("text=SQL Query")).toBeVisible();
    await page.screenshot({ path: "e2e/results/07-sql-collapsed.png", fullPage: true });
  });

  test("08 — Scrolling with multiple messages", async ({ page }) => {
    let callCount = 0;
    await page.route(/\/apps\/gen_analytics\/users\/web_user\/sessions/, async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ id: "mock-session-scroll" }),
      });
    });

    await page.route(/\/run_sse/, async (route) => {
      callCount++;
      const events = adkEvent({ text: `Response ${callCount}: Some analysis text here.` });
      await route.fulfill({
        status: 200, contentType: "text/event-stream",
        headers: { "Cache-Control": "no-cache" }, body: events,
      });
    });

    await page.route("**/api/v1/saved-queries", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    for (let i = 1; i <= 3; i++) {
      await page.locator("textarea").fill(`Question ${i}`);
      await page.locator("button", { has: page.locator("svg") }).last().click();
      await page.waitForTimeout(1500);
    }

    const chatArea = page.locator(".overflow-y-auto");
    await expect(chatArea).toBeVisible();
    await page.screenshot({ path: "e2e/results/08-scrolling.png", fullPage: true });
  });
});
