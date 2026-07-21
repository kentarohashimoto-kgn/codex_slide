import { NextResponse } from "next/server";
import { getPublicShare } from "@/lib/share-store";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const share = await getPublicShare(token);
    if (!share) return NextResponse.json({ error: "Share not found" }, { status: 404 });

    return NextResponse.json({
      share: {
        token: share.token,
        title: share.title,
        deck: share.deck,
        adConfig: share.adConfig,
        updatedAt: share.updatedAt
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Public share fetch failed" }, { status: 500 });
  }
}
