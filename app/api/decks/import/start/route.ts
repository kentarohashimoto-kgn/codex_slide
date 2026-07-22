import { NextResponse } from "next/server";
import { createImportedDeck, saveImportedDeckShell } from "@/lib/imported-decks";
import { getRequestUser } from "@/lib/request-user";
import type { AspectRatio } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = getRequestUser(request);
    const data = (await request.json()) as {
      title?: string;
      sourceFileName?: string;
      sourceMimeType?: string;
      slideCount?: number;
      aspectRatio?: AspectRatio;
    };

    const slideCount = Math.max(1, Math.min(120, Number(data.slideCount || 1)));
    const aspectRatio = data.aspectRatio === "4:3" || data.aspectRatio === "1:1" ? data.aspectRatio : "16:9";
    const deck = createImportedDeck({
      user,
      title: String(data.title || data.sourceFileName || "アップロード資料"),
      sourceFileName: String(data.sourceFileName || "uploaded.pdf"),
      sourceMimeType: String(data.sourceMimeType || "application/pdf"),
      slideCount,
      aspectRatio
    });

    await saveImportedDeckShell(deck, user);
    return NextResponse.json({ deck });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import start failed" },
      { status: 500 }
    );
  }
}

