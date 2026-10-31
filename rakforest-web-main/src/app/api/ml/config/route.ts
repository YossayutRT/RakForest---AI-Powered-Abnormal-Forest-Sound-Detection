import { modelConfig, ModelError } from "@/lib/ml-server";
export const dynamic = "force-dynamic";
export function GET() {
  try { return Response.json(modelConfig(), { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return Response.json({ error: { code: "CONFIGURATION_ERROR", message: (e as Error).message } }, { status: e instanceof ModelError ? e.status : 503 }); }
}
