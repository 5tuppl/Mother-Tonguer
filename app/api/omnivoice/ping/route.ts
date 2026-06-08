import { jsonError } from "@/lib/server/backendErrors";
import { pingOmnivoice } from "@/lib/server/omnivoiceBackend";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET() {
  try {
    const raw = await pingOmnivoice();
    return Response.json({
      provider: "omnivoice",
      configured: true,
      ...raw
    });
  } catch (error) {
    return jsonError(error);
  }
}
