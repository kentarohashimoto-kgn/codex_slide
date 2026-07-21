import { NextResponse } from "next/server";
import { createPublicShare, isSharePersistenceConfigured, listPublicShares } from "@/lib/share-store";
import { getRequestUser } from "@/lib/request-user";
import type { Deck, ShareAdConfig } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const user = getRequestUser(request);
    const shares = await listPublicShares(user);
    return NextResponse.json({ shares });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Share list failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getRequestUser(request);
    if (!isSharePersistenceConfigured()) {
      return NextResponse.json({ error: "共有・公開機能を使うにはSupabase設定が必要です" }, { status: 503 });
    }

    const data = (await request.json()) as { deck?: Deck; adConfig?: ShareAdConfig };
    if (!data.deck?.slides?.length) {
      return NextResponse.json({ error: "Deck is required" }, { status: 400 });
    }

    const share = await createPublicShare(data.deck, user, data.adConfig ?? { kind: "none" });
    return NextResponse.json({ share });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Share creation failed" }, { status: 500 });
  }
}
