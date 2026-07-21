import { NextResponse } from "next/server";
import { buildDecksPptx } from "@/lib/pptx";
import type { Deck } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type ExportBundleRequest = {
  title?: string;
  decks?: Deck[];
};

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as ExportBundleRequest;
    const decks = Array.isArray(data.decks) ? data.decks : [];
    if (decks.length === 0) {
      return NextResponse.json({ error: "No decks selected" }, { status: 400 });
    }

    const title = data.title?.trim() || buildBundleTitle(decks);
    const file = await buildDecksPptx(decks, title);
    const blob = new Blob([new Uint8Array(file)], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    });
    const filename = encodeURIComponent(`${title}.pptx`);

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "PPTX bundle export failed" }, { status: 500 });
  }
}

function buildBundleTitle(decks: Deck[]) {
  if (decks.length === 1) return decks[0]?.title || "deck";
  return `Codex Slide Bundle ${new Date().toISOString().slice(0, 10)}`;
}
