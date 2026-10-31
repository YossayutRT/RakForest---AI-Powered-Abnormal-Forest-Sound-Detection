import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";

const output = "test-results/accessibility";
test.beforeEach(async ({ page }) => {
  // Layout fixtures avoid bulk tile requests to the public map provider.
  await page.route("https://tile.openstreetmap.org/**", r => r.fulfill({ contentType: "image/png", body: readFileSync("tests/fixtures/map-tile.png") }));
  await page.route("https://mcp.figma.com/**", r => r.abort());
});
async function login(page: Page, field = false) {
  await page.goto("/login"); await page.getByRole("button", { name: field ? "เจ้าหน้าที่ภาคสนาม" : "เจ้าหน้าที่ส่วนกลาง" }).click();
  await expect(page).toHaveURL(field ? /field\/tasks/ : /office\/dashboard/);
}
async function layout(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".skeleton")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const smallText = await page.locator("body").evaluate(body => [...body.querySelectorAll<HTMLElement>("button,a,label,p,small,dt,dd,h1,h2,h3,.badge,.demo-label")].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden" && el.textContent?.trim() && !el.closest(".maplibregl-ctrl-logo")).filter(el => parseFloat(getComputedStyle(el).fontSize) < 14).map(el => ({ text: el.textContent?.slice(0, 60), size: getComputedStyle(el).fontSize })));
  expect(smallText).toEqual([]);
  const tinyControls = await page.locator("body").evaluate(body => [...body.querySelectorAll<HTMLElement>("button,.button,.sidebar nav a,.bottom-nav a,input:not([type=checkbox]):not([type=radio]),select,textarea,.check-label,.outcome-grid label")].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden").filter(el => el.getBoundingClientRect().height < 47.5).map(el => ({ text: el.textContent?.slice(0, 40), height: el.getBoundingClientRect().height })));
  expect(tinyControls).toEqual([]);
}

for (const width of [390, 768, 1366, 1920]) {
  test(`readable workflow and page screenshots at ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    await mkdir(output, { recursive: true });
    await page.setViewportSize({ width, height: width < 1000 ? 1000 : 1080 });
    await page.goto("/login"); await layout(page);
    await page.screenshot({ path: `${output}/${width}-login.png`, fullPage: true });
    await login(page);
    for (const [name, path] of [["dashboard", "/office/dashboard"], ["map", "/office/map"], ["upload", "/office/upload"], ["incidents", "/office/incidents"], ["review", "/office/incidents/RF-001"]]) {
      await page.goto(path); await layout(page);
      if (name === "map") {
        await expect(page.locator("[data-map-ready=true]")).toBeVisible();
        await page.getByRole("button", { name: "ดูเสาทั้งหมด", exact: true }).click();
        await expect(page.locator("[data-map-idle=true]")).toBeVisible();
        await expect(page.locator(".map-pin.is-selected")).toHaveCount(1);
        await expect(page.getByRole("button", { name: "เสา A · ST-01", exact: true })).toHaveAttribute("aria-pressed", "true");
      }
      if (name === "incidents") { await expect(page.locator(width <= 850 ? ".incident-cards" : ".incident-table")).toBeVisible(); await expect(page.locator(width <= 850 ? ".incident-table" : ".incident-cards")).toBeHidden(); }
      await page.screenshot({ path: `${output}/${width}-${name}.png`, fullPage: true });
    }
    await login(page, true);
    await layout(page); await page.screenshot({ path: `${output}/${width}-field-tasks.png`, fullPage: true });
    await page.goto("/field/tasks/RF-002"); await layout(page);
    await page.screenshot({ path: `${output}/${width}-field-detail.png`, fullPage: true });
    await page.getByRole("button", { name: "รับทราบงาน", exact: true }).click();
    await page.getByRole("link", { name: "ส่งผลตรวจสอบ", exact: true }).click(); await layout(page);
    await page.screenshot({ path: `${output}/${width}-field-result.png`, fullPage: true });
    const submit = page.getByRole("button", { name: "ส่งผลตรวจสอบ", exact: true });
    await submit.scrollIntoViewIfNeeded();
    const button = await submit.boundingBox(), nav = await page.locator(".bottom-nav").boundingBox();
    expect(button!.y + button!.height).toBeLessThanOrEqual(nav!.y);
  });
}

test("keyboard menu and modal trap, escape, and return focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await login(page);
  await page.getByRole("button", { name: "เปิดเมนู", exact: true }).click();
  await expect(page.locator("#office-navigation a").first()).toBeFocused();
  await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "เปิดเมนู", exact: true })).toBeFocused();
  await expect(page.locator(".sidebar")).toBeHidden();
  const reset = page.getByRole("button", { name: "รีเซ็ตข้อมูลสาธิต", exact: true }); await reset.click();
  const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "ยกเลิก", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab"); await expect(dialog.getByRole("button", { name: "คืนข้อมูลตัวอย่าง", exact: true })).toBeFocused();
  await page.keyboard.press("Tab"); await expect(dialog.getByRole("button", { name: "ยกเลิก", exact: true })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(reset).toBeFocused();
  const focus = await reset.evaluate(el => ({ width: getComputedStyle(el).outlineWidth, style: getComputedStyle(el).outlineStyle }));
  expect(focus.style).not.toBe("none"); expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(3);
});

test("inline station errors focus the field, preserve inputs, and selection preserves marker focus", async ({ page }) => {
  await login(page); await page.goto("/office/map");
  await page.getByRole("button", { name: "เพิ่มเสาไมค์", exact: true }).click();
  await page.getByRole("button", { name: "บันทึกเสา", exact: true }).click();
  await expect(page.getByLabel("รหัสเสา", { exact: true })).toBeFocused();
  await expect(page.getByLabel("รหัสเสา", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#station-id-error")).toContainText("กรุณากรอกรหัส");
  await page.getByLabel("ชื่อเสา", { exact: true }).fill("คงข้อมูลไว้"); await page.getByRole("button", { name: "บันทึกเสา", exact: true }).click();
  await expect(page.getByLabel("ชื่อเสา", { exact: true })).toHaveValue("คงข้อมูลไว้");
  await page.getByRole("button", { name: "ยกเลิก", exact: true }).click();
  await expect(page.locator("[data-map-ready=true]")).toBeVisible();
  const marker = page.getByRole("button", { name: "เลือกเสา B", exact: true }); await marker.focus(); await page.keyboard.press("Enter");
  await expect(marker).toBeFocused(); await expect(marker).toHaveAttribute("aria-pressed", "true");
});

test("200% text and equivalent 200% browser layout remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 1000 }); await login(page); await page.goto("/office/map");
  // Text-only magnification catches fixed-size text and rem layout constraints.
  await page.addStyleTag({ content: "html{font-size:200%}" }); await layout(page);
  await page.getByRole("button", { name: "เพิ่มเสาไมค์", exact: true }).click(); await layout(page);
  expect(await page.getByLabel("รหัสเสา", { exact: true }).evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBe(32);
  // A 1366px browser at 200% has about 683 CSS px of layout space.
  await page.setViewportSize({ width: 683, height: 500 }); await page.goto("/office/incidents"); await layout(page);
  await expect(page.locator(".incident-cards")).toBeVisible();
  await page.getByRole("link", { name: "ดูรายละเอียด RF-001", exact: true }).click(); await layout(page);
});

test("primary, auxiliary and status text meet chosen contrast targets", async ({ page }) => {
  await login(page); await page.goto("/office/incidents");
  const failures = await page.evaluate(() => {
    const rgb = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const luminance = (v: number[]) => v.map(c => { c /= 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
    return [...document.querySelectorAll<HTMLElement>(".muted,.badge,.sidebar-sub,.sidebar nav a,.mode-notice,.eyebrow")].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden").flatMap(el => {
      let bg: Element | null = el; while (bg && getComputedStyle(bg).backgroundColor === "rgba(0, 0, 0, 0)") bg = bg.parentElement;
      const a = luminance(rgb(getComputedStyle(el).color)), b = luminance(rgb(bg ? getComputedStyle(bg).backgroundColor : "rgb(255,255,255)"));
      const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      return ratio < 4.5 ? [{ text: el.textContent, ratio }] : [];
    });
  }); expect(failures).toEqual([]);
});
