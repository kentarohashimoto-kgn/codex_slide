import { NextResponse } from "next/server";
import { logShareEvent } from "@/lib/share-store";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const data = (await request.json()) as {
      eventType?: "page_view" | "page_duration" | "ad_click";
      pageNo?: number;
      viewerId?: string;
      viewerLabel?: string;
      metadata?: Record<string, unknown>;
    };
    if (!data.eventType || !data.viewerId || !Number.isFinite(data.pageNo)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const event = await logShareEvent(
      token,
      {
        eventType: data.eventType,
        pageNo: Number(data.pageNo),
        viewerId: data.viewerId,
        viewerLabel: data.viewerLabel,
        metadata: data.metadata
      },
      request
    );
    if (!event) return NextResponse.json({ error: "Share not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Share event logging failed" }, { status: 500 });
  }
}
