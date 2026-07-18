import { NextResponse } from "next/server";
import { regenerateSlide } from "@/lib/openai";
import type { DeckGenerationRequest, Slide } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

type RegenerateRequest = {
  deckInput: DeckGenerationRequest;
  slide: Slide;
  instruction?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegenerateRequest;
    const slide = await regenerateSlide(
      {
        ...body.deckInput,
        tone: [body.deckInput.tone, body.instruction].filter(Boolean).join("\n追加修正: ")
      },
      body.slide
    );

    return NextResponse.json({ slide });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Slide regeneration failed" },
      { status: 500 }
    );
  }
}
