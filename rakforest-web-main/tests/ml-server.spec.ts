import { test, expect } from "@playwright/test";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { analyzeAudio, modelConfig } from "../src/lib/ml-server";
import { parseModelResult, validateAudio } from "../src/lib/ml-contract";

const valid = { requestId: "http-test", modelVersion: "friend-v1", label: "bird", scores: [{ classId: "bird", label: "เสียงนก", score: 0.8 }, { classId: "other", score: 0.2 }] };
async function upstream(handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>, action: () => Promise<void>) {
  const server = createServer((req, res) => { Promise.resolve(handler(req, res)).catch(() => res.destroy()); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing address");
  const old = { mode: process.env.ML_PROVIDER, endpoint: process.env.AI_CLASSIFICATION_ENDPOINT, key: process.env.AI_CLASSIFICATION_API_KEY, timeout: process.env.ML_TIMEOUT_MS };
  Object.assign(process.env, { ML_PROVIDER: "http", AI_CLASSIFICATION_ENDPOINT: `http://127.0.0.1:${address.port}/analyze`, AI_CLASSIFICATION_API_KEY: "test-server-only-key", ML_TIMEOUT_MS: "1000" });
  try { await action(); } finally {
    for (const [name, value] of Object.entries({ ML_PROVIDER: old.mode, AI_CLASSIFICATION_ENDPOINT: old.endpoint, AI_CLASSIFICATION_API_KEY: old.key, ML_TIMEOUT_MS: old.timeout })) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  }
}
const audio = () => new File(["test-audio"], "forest.wav", { type: "audio/wav" });

test("HTTP adapter forwards actual multipart and bearer key, accepts new classes", async () => {
  let received = false;
  await upstream(async (req, res) => {
    expect(req.headers.authorization).toBe("Bearer test-server-only-key");
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const incoming = new Request("http://local/analyze", { method: "POST", headers: { "content-type": req.headers["content-type"]! }, body: new Uint8Array(Buffer.concat(chunks)) });
    const body = await incoming.formData();
    expect(body.get("requestId")).toBe("http-test"); expect(body.get("stationId")).toBe("ST-02");
    expect(await (body.get("audio") as File).text()).toBe("test-audio");
    expect(body.has("simulateFailure")).toBe(false); received = true;
    res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(valid));
  }, async () => {
    const result = await analyzeAudio(audio(), "http-test", "ST-02", true);
    expect(result.source).toBe("http"); expect(result.scores).toEqual(valid.scores); expect(received).toBe(true);
  });
});

for (const scenario of ["error", "invalid", "scale", "timeout", "html", "malformed"] as const) {
  test(`HTTP adapter rejects ${scenario} without mock fallback`, async () => {
    await upstream(async (_req, res) => {
      if (scenario === "timeout") await new Promise(resolve => setTimeout(resolve, 400));
      res.writeHead(scenario === "error" ? 503 : 200, { "content-type": scenario === "html" ? "text/html" : "application/json" });
      res.end(scenario === "malformed" ? "{" : JSON.stringify(scenario === "invalid" ? {} : scenario === "scale" ? { ...valid, scores: [{ classId: "bird", score: 80 }] } : valid));
    }, async () => {
      if (scenario === "timeout") process.env.ML_TIMEOUT_MS = "100";
      await expect(analyzeAudio(audio(), "http-test", "ST-01", false)).rejects.toMatchObject({ code: scenario === "timeout" ? "TIMEOUT" : scenario === "error" ? "UPSTREAM_ERROR" : "INVALID_RESULT" });
    });
  });
}

test("unavailable HTTP and missing configuration do not call mock", async () => {
  await upstream((_req, res) => { res.destroy(); }, async () => {
    await expect(analyzeAudio(audio(), "http-test", "ST-01", false)).rejects.toMatchObject({ code: "UNAVAILABLE" });
    delete process.env.AI_CLASSIFICATION_ENDPOINT;
    expect(modelConfig().configured).toBe(false);
    await expect(analyzeAudio(audio(), "http-test", "ST-01", false)).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });
});

test("result contract rejects duplicate, missing, mismatched, non-finite and non-top classes", () => {
  for (const value of [null, { ...valid, requestId: "wrong" }, { ...valid, modelVersion: "" }, { ...valid, scores: [] }, { ...valid, scores: [{ classId: "other", score: 1 }] }, { ...valid, scores: [{ classId: "bird", score: NaN }] }, { ...valid, scores: [{ classId: "bird", score: -0.1 }] }, { ...valid, scores: [{ classId: "bird", score: 0.1 }, { classId: "bird", score: 0.2 }] }, { ...valid, scores: [{ classId: "bird", score: 0.1 }, { classId: "other", score: 0.9 }] }]) {
    expect(() => parseModelResult(value, "http-test", "http")).toThrow();
  }
  expect(() => validateAudio({ name: "x.wav", type: "audio/wav", size: 0 })).toThrow("ไฟล์เสียงว่าง");
  expect(() => validateAudio({ name: "x.txt", type: "text/plain", size: 1 })).toThrow("โปรดเลือกไฟล์เสียง");
  expect(() => validateAudio({ name: "x.wav", type: "audio/wav", size: 20 * 1024 * 1024 + 1 })).toThrow("20 MB");
});

test("Next API validates uploads and returns server-owned source", async ({ request }) => {
  const config = await request.get("/api/ml/config"); expect(config.ok()).toBe(true);
  expect(await config.json()).toMatchObject({ mode: "mock", configured: true, provisional: true });
  const send = (name: string, mimeType: string, buffer: Buffer) => request.post("/api/ml/analyze", { multipart: { requestId: "api-test", stationId: "ST-01", audio: { name, mimeType, buffer } } });
  const ok = await send("x.wav", "audio/wav", Buffer.from("audio"));
  expect(ok.status()).toBe(200); expect(await ok.json()).toMatchObject({ source: "mock", requestId: "api-test", label: "chainsaw" });
  expect((await send("x.txt", "text/plain", Buffer.from("bad"))).status()).toBe(400);
  expect((await send("x.wav", "audio/wav", Buffer.alloc(0))).status()).toBe(400);
  expect((await send("x.wav", "audio/wav", Buffer.alloc(20 * 1024 * 1024 + 65537))).status()).toBe(413);
  expect((await request.post("/api/ml/analyze", { data: "invalid" })).status()).toBe(400);
  expect((await request.post("/api/ml/analyze", { headers: { origin: "https://other.invalid" } })).status()).toBe(403);
});
