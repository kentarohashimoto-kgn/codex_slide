import { NextResponse } from "next/server";
import { generateDeck } from "@/lib/openai";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Deck, DeckGenerationRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const input = normalizeInput((await request.json()) as Partial<DeckGenerationRequest>);
    const deck = await generateDeck(input);
    await persistDeck(deck);

    return NextResponse.json({ deck });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Deck generation failed" }, { status: 500 });
  }
}

function normalizeInput(input: Partial<DeckGenerationRequest>): DeckGenerationRequest {
  return {
    title: String(input.title || "AI Slide Deck").trim(),
    purpose: String(input.purpose || "AIを使った資料作成の価値を伝える").trim(),
    audience: String(input.audience || "AI活用を始めたいビジネス担当者").trim(),
    material: String(input.material || "").trim(),
    tone: String(input.tone || "初心者にもわかりやすく、実務的で安心感のある表現").trim(),
    slideCount: Math.max(3, Math.min(30, Number(input.slideCount || 18))),
    language: String(input.language || "ja").trim(),
    mode: input.mode === "html" ? "html" : "image",
    templateId: String(input.templateId || "soft-paper-guide").trim()
  };
}

async function persistDeck(deck: Deck) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error: deckError } = await supabase.from("decks").upsert({
    id: deck.id,
    title: deck.title,
    purpose: deck.purpose,
    audience: deck.audience,
    mode: deck.mode,
    template_id: deck.templateId,
    status: deck.status,
    slide_count: deck.slideCount,
    created_at: deck.createdAt,
    updated_at: deck.updatedAt
  });

  if (deckError) {
    console.warn("Supabase deck persist failed", deckError);
    return;
  }

  const { error: slidesError } = await supabase.from("slides").upsert(
    deck.slides.map((slide) => ({
      id: slide.id,
      deck_id: deck.id,
      page_no: slide.pageNo,
      section: slide.section,
      title: slide.title,
      summary: slide.summary,
      body: slide.body,
      speaker_notes: slide.speakerNotes,
      layout_type: slide.layoutType,
      html_content: slide.htmlContent,
      css_content: slide.cssContent,
      image_url: slide.imageUrl,
      prompt: slide.imagePrompt,
      status: slide.status
    }))
  );

  if (slidesError) console.warn("Supabase slide persist failed", slidesError);
}

