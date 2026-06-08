export const runtime = "nodejs";

export async function POST() {
  return Response.json(
    {
      message:
        "Voice cloning requires an enabled custom-voice account and a consent recording. The app will keep the local sample as a fallback."
    },
    { status: 501 }
  );
}
