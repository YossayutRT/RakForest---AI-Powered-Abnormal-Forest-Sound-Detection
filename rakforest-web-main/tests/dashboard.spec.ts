import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
test.beforeEach(async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", r => r.fulfill({ contentType: "image/png", body: readFileSync("tests/fixtures/map-tile.png") }));
  await page.route("https://mcp.figma.com/**", r => r.abort());
});
async function open(page: Page) { await page.goto("/login"); await page.getByRole("button", { name: "เจ้าหน้าที่ส่วนกลาง" }).click(); await expect(page.getByRole("heading", { name: "ภาพรวม", exact: true })).toBeVisible(); }

for (const [width, height] of [[1366, 768], [1920, 1080]]) {
  test(`desktop overview fits ${width}x${height} with independent work scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height }); await open(page);
    await expect(page.locator("[data-map-idle=true]")).toBeVisible();
    for (const selector of [".dashboard-metrics", ".dashboard-map", ".dashboard-work", ".dashboard-all-events"]) {
      const box = await page.locator(selector).boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0); expect(box!.y + box!.height).toBeLessThanOrEqual(height);
    }
    const map = await page.locator(".dashboard-map").boundingBox(), work = await page.locator(".dashboard-work").boundingBox();
    expect(work!.width).toBeGreaterThanOrEqual(320); expect(map!.width).toBeGreaterThan(work!.width * 1.7);
    await expect(page.getByRole("heading", { name: "กระบวนการตรวจสอบ", exact: true })).toHaveCount(0);
    await expect(page.locator(".dashboard-overview table")).toHaveCount(0);
    mkdirSync("test-results/accessibility", { recursive: true });
    await page.screenshot({ path: `test-results/accessibility/${width}-dashboard-compact.png`, fullPage: true });
  });
}

test("metrics, station selection, filters and details operate on the same incidents", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("region", { name: "รายการงานรอตรวจ", exact: true }).getByRole("article")).toHaveCount(1);
  await page.getByRole("button", { name: /^กำลังดำเนินการ/ }).click();
  await expect(page.getByLabel("รายการที่ต้องการดู", { exact: true })).toHaveValue("working");
  await expect(page.getByRole("article", { name: "งาน RF-002", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^รอปิดงาน/ }).click(); await expect(page.getByRole("article", { name: "งาน RF-003", exact: true })).toBeVisible();
  await page.getByLabel("รายการที่ต้องการดู", { exact: true }).selectOption("latest");
  await expect(page.locator(".overview-job h3")).toHaveText(["RF-001", "RF-002", "RF-003"]);
  const marker = page.getByRole("button", { name: "เลือกเสา B", exact: true }); await marker.focus(); await page.keyboard.press("Enter");
  await expect(marker).toBeFocused(); await expect(marker).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".overview-job")).toHaveCount(1); await expect(page.locator(".overview-job")).toContainText("RF-002");
  await page.getByRole("button", { name: "แสดงงานทุกเสา", exact: true }).click(); await expect(page.locator(".overview-job")).toHaveCount(3);
  await page.getByLabel("เลือกเสาในภาพรวม", { exact: true }).selectOption("ST-03"); await expect(page.locator(".overview-job")).toHaveCount(1);
  await page.getByRole("button", { name: /^รอตรวจ/ }).click();
  await expect(page.getByLabel("เลือกเสาในภาพรวม", { exact: true })).toHaveValue("");
  await page.getByRole("link", { name: "ดูรายละเอียด RF-001", exact: true }).click(); await expect(page).toHaveURL(/office\/incidents\/RF-001$/);
  await page.goto("/office/dashboard"); await page.getByRole("link", { name: "เปิดรายการเหตุการณ์ทั้งหมด", exact: true }).click(); await expect(page).toHaveURL(/office\/incidents$/);
  await page.goto("/office/dashboard"); await page.getByRole("link", { name: "ดูเสาไมค์ 3 เสา", exact: true }).click(); await expect(page).toHaveURL(/office\/map$/);
});

for (const width of [390, 768]) {
  test(`small screen tabs and metric shortcuts at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 }); await open(page);
    await expect(page.locator(".dashboard-map")).toBeVisible(); await expect(page.locator(".dashboard-work")).toBeHidden();
    await page.getByRole("button", { name: "รายการงาน", exact: true }).click();
    await expect(page.locator(".dashboard-map")).toBeHidden(); await expect(page.locator(".dashboard-work")).toBeVisible();
    expect(await page.locator(".dashboard-work-list").evaluate(el => getComputedStyle(el).overflowY)).toBe("visible");
    await page.getByRole("button", { name: "แผนที่", exact: true }).click();
    await page.getByRole("button", { name: /^รอปิดงาน/ }).click();
    await expect(page.locator(".dashboard-work")).toBeVisible(); await expect(page.locator("#overview-work-title")).toBeFocused();
    await expect(page.getByRole("article", { name: "งาน RF-003", exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/accessibility/${width}-dashboard-work.png`, fullPage: true });
    await page.getByRole("button", { name: "แผนที่", exact: true }).click();
    await expect(page.locator("[data-map-idle=true]")).toBeVisible();
    await page.getByLabel("เลือกเสาในภาพรวม", { exact: true }).selectOption("ST-01");
    await page.getByRole("button", { name: "รายการงาน", exact: true }).click();
    await expect(page.getByText("ไม่มีงานรอปิดงานของเสานี้", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("many jobs scroll within the desktop panel; empty state and 200% text still work", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 }); await open(page);
  await page.evaluate(() => new Promise<void>(resolve => {
    const r = indexedDB.open("rakforest-demo-v1"); r.onsuccess = () => {
      const db = r.result, tx = db.transaction("state", "readwrite"), store = tx.objectStore("state"), q = store.get("main");
      q.onsuccess = () => { const s = q.result, original = s.incidents[0]; s.incidents = Array.from({ length: 30 }, (_, n) => ({ ...original, id: `RF-${100 + n}`, prediction: { ...original.prediction, recordedAt: new Date(Date.UTC(2026, 9, 24, 0, n)).toISOString() } })); store.put(s, "main"); };
      tx.oncomplete = () => { db.close(); resolve(); };
    };
  }));
  await expect(page.locator(".overview-job")).toHaveCount(30);
  await expect(page.locator(".overview-job h3").first()).toHaveText("RF-129");
  const panel = page.getByRole("region", { name: "รายการงานรอตรวจ", exact: true });
  expect(await panel.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await panel.focus();
  const pagePosition = await page.evaluate(() => scrollY);
  await page.keyboard.press("End");
  await expect.poll(() => panel.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(pagePosition);
  await page.addStyleTag({ content: "html{font-size:200%}" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: /^รอปิดงาน/ }).click();
  await expect(page.getByText("ไม่มีงานรอปิดงาน", { exact: true })).toBeVisible();
});
