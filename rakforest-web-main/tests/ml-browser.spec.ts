import { test, expect, type Page } from "@playwright/test";
const config = { mode: "http", configured: true, provisional: true, timeoutMs: 1000, limits: { extensions: ["wav"], maxBytes: 20971520 } };
async function login(page: Page) { await page.goto("/login"); await page.getByRole("button", { name: "เจ้าหน้าที่ส่วนกลาง" }).click(); await page.goto("/office/upload"); }
async function data(page: Page) { return page.evaluate(() => new Promise<any>(resolve => { const r = indexedDB.open("rakforest-demo-v1"); r.onsuccess = () => { const db = r.result; const q = db.transaction("state").objectStore("state").get("main"); q.onsuccess = () => { resolve(q.result); db.close(); }; }; })); }
test.beforeEach(async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", r => r.abort());
  await page.route("**/api/ml/config", r => r.fulfill({ json: config }));
});

test("HTTP result with new class persists, filters, maps and dispatch preview use labels", async ({ page }) => {
  let count = 0;
  await page.route("**/api/ml/analyze", async r => {
    count++;
    const form = await new Request("http://test", { method: "POST", headers: r.request().headers(), body: new Uint8Array(r.request().postDataBuffer()!) }).formData();
    await r.fulfill({ json: { requestId: form.get("requestId"), modelVersion: "friend-v1", label: "bird", source: "http", scores: [{ classId: "bird", label: "เสียงนก", score: .8 }, { classId: "toString", score: .2 }] } });
  });
  await login(page);
  await page.getByLabel("ไฟล์เสียง", { exact: true }).setInputFiles({ name: "bird.wav", mimeType: "audio/wav", buffer: Buffer.from("audio") });
  await page.getByRole("button", { name: "ส่งวิเคราะห์ด้วยโมเดล", exact: true }).dblclick();
  await page.getByRole("link", { name: /เปิดผล RF-004/ }).click();
  await expect(page.getByRole("heading", { name: "เสียงนก", exact: true })).toBeVisible();
  await expect(page.getByText("toString", { exact: true })).toBeVisible();
  await expect(page.getByText("ผลจากบริการโมเดล", { exact: true })).toBeVisible();
  await expect(page.locator(".telegram-preview")).toContainText("เสียงนก");
  await page.reload(); await expect(page.locator("audio")).toHaveAttribute("src", /^blob:/);
  expect(count).toBe(1); expect((await data(page)).incidents[0].prediction.source).toBe("http");
  await page.goto("/office/incidents"); await page.getByRole("combobox", { name: "ประเภทเสียง", exact: true }).selectOption("bird");
  await expect(page.locator("tbody tr")).toHaveCount(1); await expect(page.locator("tbody")).toContainText("เสียงนก");
  await page.goto("/office/map"); await expect(page.locator(".mini-incident").filter({ hasText: "RF-004" })).toContainText("เสียงนก");
  await page.goto("/office/dashboard"); await expect(page.locator(".dashboard-work-list")).toContainText("ผลจากบริการโมเดล");
  await page.route("**/api/ml/config", r => r.fulfill({ json: { ...config, mode: "mock" } }));
  await page.reload(); await expect(page.locator(".dashboard-work-list")).toContainText("ผลจากบริการโมเดล");
});

test("reload during request preserves file, fails interrupted job, retry creates one incident", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/ml/analyze", async r => {
    calls++;
    if (calls === 1) { await new Promise(resolve => setTimeout(resolve, 3000)); await r.abort().catch(() => {}); return; }
    const form = await new Request("http://test", { method: "POST", headers: r.request().headers(), body: new Uint8Array(r.request().postDataBuffer()!) }).formData();
    await r.fulfill({ json: { requestId: form.get("requestId"), modelVersion: "friend-v1", label: "bird", source: "http", scores: [{ classId: "bird", score: 1 }] } });
  });
  await login(page);
  await page.getByLabel("ไฟล์เสียง", { exact: true }).setInputFiles({ name: "keep.wav", mimeType: "audio/wav", buffer: Buffer.from("keep") });
  const sent = page.waitForRequest("**/api/ml/analyze"); await page.getByRole("button", { name: "ส่งวิเคราะห์ด้วยโมเดล", exact: true }).click(); await sent;
  await page.reload(); await expect(page.locator("p.error-text[role=alert]")).toContainText("งานถูกขัดจังหวะ");
  expect((await data(page)).attachments[0].name).toBe("keep.wav"); expect(calls).toBe(1);
  await page.getByRole("button", { name: "ลองวิเคราะห์ใหม่", exact: true }).click();
  await page.getByRole("link", { name: /เปิดผล RF-004/ }).click();
  expect((await data(page)).incidents).toHaveLength(4); expect(calls).toBe(2);
});

test("HTTP failure stays failed and missing configuration prevents upload", async ({ page }) => {
  await page.route("**/api/ml/analyze", r => r.fulfill({ status: 504, json: { error: { code: "TIMEOUT", message: "บริการโมเดลใช้เวลานานเกินกำหนด" } } }));
  await login(page);
  await page.getByLabel("ไฟล์เสียง", { exact: true }).setInputFiles({ name: "x.wav", mimeType: "audio/wav", buffer: Buffer.from("audio") });
  await page.getByRole("button", { name: "ส่งวิเคราะห์ด้วยโมเดล", exact: true }).click();
  await expect(page.locator("p.error-text[role=alert]")).toContainText("ใช้เวลานานเกินกำหนด");
  expect((await data(page)).incidents).toHaveLength(3);
  await page.route("**/api/ml/config", r => r.fulfill({ json: { ...config, configured: false } })); await page.reload();
  await expect(page.getByRole("status")).toContainText("ยังไม่ได้ตั้งค่า");
  await expect(page.getByRole("button", { name: "ส่งวิเคราะห์ด้วยโมเดล", exact: true })).toBeDisabled();
});

test("legacy v2 migration keeps custom stations, audio and results and never resubmits", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/ml/analyze", r => { calls++; return r.abort(); });
  await login(page);
  await page.evaluate(() => new Promise<void>(resolve => {
    const r = indexedDB.open("rakforest-demo-v1");
    r.onsuccess = () => {
      const db = r.result, tx = db.transaction("state", "readwrite"), store = tx.objectStore("state"), q = store.get("main");
      q.onsuccess = () => {
        const s = q.result;
        s.stations.push({ ...s.stations[0], id: "CUSTOM", name: "เสาที่เพิ่มไว้" });
        s.incidents.forEach((i: any) => delete i.prediction.source);
        s.attachments.push({ id: "legacy-audio", name: "legacy.wav", blob: new Blob(["legacy"], { type: "audio/wav" }) });
        s.jobs.push({ id: "legacy", stationId: "CUSTOM", audioId: "legacy-audio", createdAt: new Date().toISOString(), readyAt: Date.now() + 50000, status: "processing", fail: false });
        store.put(s, "main");
      };
      tx.oncomplete = () => { db.close(); resolve(); };
    };
  }));
  await page.reload(); await expect(page.locator("p.error-text[role=alert]")).toContainText("งานถูกขัดจังหวะ");
  const saved = await data(page);
  expect(saved.stations.find((s: any) => s.id === "CUSTOM").name).toBe("เสาที่เพิ่มไว้");
  expect(saved.incidents).toHaveLength(3); expect(saved.incidents.every((i: any) => i.prediction.source === "mock")).toBe(true);
  expect(saved.jobs[0].source).toBe("mock"); expect(saved.jobs[0].stationSnapshot.id).toBe("CUSTOM");
  expect(saved.attachments[0].name).toBe("legacy.wav"); expect(calls).toBe(0);
});
