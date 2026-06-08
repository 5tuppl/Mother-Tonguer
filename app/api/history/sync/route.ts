import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const records = Array.isArray(payload?.records) ? payload.records : [];
  const remoteUrl = process.env.HISTORY_SYNC_URL;

  if (!remoteUrl) {
    return NextResponse.json({
      remote: false,
      stored: records.length
    });
  }

  const response = await fetch(remoteUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.HISTORY_SYNC_TOKEN ? { authorization: `Bearer ${process.env.HISTORY_SYNC_TOKEN}` } : {})
    },
    body: JSON.stringify({ records })
  });

  if (!response.ok) {
    return NextResponse.json(
      { remote: true, synced: false, status: response.status },
      { status: 502 }
    );
  }

  return NextResponse.json({ remote: true, synced: true, stored: records.length });
}
