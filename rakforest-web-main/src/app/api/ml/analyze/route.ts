import { analyzeAudio, ModelError } from "@/lib/ml-server";
import { audioLimits } from "@/lib/ml-contract";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let requestId: string | undefined;
  try {
    // This local demo has no authentication. Reject cross-origin browser uploads.
    const origin = request.headers.get("origin");
    const host = request.headers.get("host") ?? new URL(request.url).host;
    let sameOrigin = !origin;
    try { if (origin) sameOrigin = new URL(origin).host === host; } catch { sameOrigin = false; }
    if (request.headers.get("sec-fetch-site") === "cross-site" || !sameOrigin) throw new ModelError("FORBIDDEN", "ไม่อนุญาตคำขอจากเว็บไซต์อื่น", 403);
    if (Number(request.headers.get("content-length")) > audioLimits.maxBytes + 65536) throw new ModelError("FILE_TOO_LARGE", "ไฟล์เสียงมีขนาดเกินกำหนด", 413);
    let form: FormData;
    try { form = await request.formData(); } catch { throw new ModelError("INVALID_REQUEST", "ต้องส่งไฟล์แบบ multipart/form-data", 400); }
    const audio = form.get("audio"), id = form.get("requestId"), stationId = form.get("stationId");
    if (!(audio instanceof File) || typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id) || typeof stationId !== "string" || !stationId.trim() || stationId.length > 200) throw new ModelError("INVALID_REQUEST", "กรุณาส่ง audio, requestId และ stationId ให้ครบ", 400);
    requestId = id;
    try {
      const result = await analyzeAudio(audio, id, stationId, form.get("simulateFailure") === "true", request.signal);
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (e) { if (e instanceof ModelError) throw e; throw new ModelError("INVALID_AUDIO", (e as Error).message, 400); }
  } catch (e) {
    const error = e instanceof ModelError ? e : new ModelError("INTERNAL_ERROR", "บริการวิเคราะห์เกิดข้อผิดพลาด", 500);
    return Response.json({ requestId, error: { code: error.code, message: error.message } }, { status: error.status });
  }
}
