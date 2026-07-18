import { NextResponse } from "next/server";
import { buildDeckPptx } from "@/lib/pptx";
import type { Deck } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const deck = (await request.json()) as Deck;
    const file = await buildDeckPptx(deck);
    const blob = new Blob([new Uint8Array(file)], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    });
    const filename = encodeURIComponent(`${deck.title || "deck"}.pptx`);

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "PPTX export failed" }, { status: 500 });
  }
}
