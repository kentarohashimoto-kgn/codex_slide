import { NextResponse } from "next/server";
import { generateDeck } from "@/lib/openai";
import { getRequestUser } from "@/lib/request-user";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getTemplatesBySource } from "@/lib/templates";
import type { Deck, DeckGenerationRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const input = normalizeInput((await request.json()) as Partial<DeckGenerationRequest>);
    const deck = await generateDeck(input);
    const user = getRequestUser(request);
    const userDeck = { ...deck, userId: user };
    await persistDeck(userDeck, user);

    return NextResponse.json({ deck: userDeck });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Deck generation failed" },
      { status: 500 }
    );
  }
}

function normalizeInput(input: Partial<DeckGenerationRequest>): DeckGenerationRequest {
  const templateSource = input.templateSource === "company" ? "company" : "system";
  const sourceTemplates = getTemplatesBySource(templateSource);
  const templateId = sourceTemplates.some((template) => template.id === input.templateId)
    ? String(input.templateId)
    : sourceTemplates[0]?.id ?? "soft-paper-guide";
  const slideCount = Math.max(1, Math.min(30, Number(input.slideCount || 18)));
  const totalPages = Math.max(slideCount, Number(input.totalPages || slideCount));
  const pageNumberOffset = Math.max(1, Number(input.pageNumberOffset || 1));

  return {
    title: String(input.title || "AI Slide Deck").trim(),
    purpose: String(input.purpose || "AIを使った資料作成の価値を伝える").trim(),
    audience: String(input.audience || "AI活用を始めたいビジネス担当者").trim(),
    material: String(input.material || "").trim(),
    tone: String(input.tone || "初心者にもわかりやすく、実務的で安心感のある表現").trim(),
    slideCount,
    language: String(input.language || "ja").trim(),
    mode: input.mode === "html" ? "html" : "image",
    templateSource,
    templateId,
    deckType: input.deckType === "chapter" ? "chapter" : "single",
    chapterTotal: Math.max(1, Math.min(20, Number(input.chapterTotal || 1))),
    chapterIndex: Math.max(1, Math.min(20, Number(input.chapterIndex || 1))),
    aspectRatio: input.aspectRatio === "4:3" || input.aspectRatio === "1:1" ? input.aspectRatio : "16:9",
    typographyPreset:
      input.typographyPreset === "mincho" || input.typographyPreset === "mono" ? input.typographyPreset : "gothic",
    textVisibility: input.textVisibility === "high" || input.textVisibility === "compact" ? input.textVisibility : "standard",
    brandColor: String(input.brandColor || "").trim(),
    showPageNumber: Boolean(input.showPageNumber),
    splitPagination: Boolean(input.splitPagination),
    totalPages,
    pageNumberOffset,
    showFooterTitle: Boolean(input.showFooterTitle),
    coverMessagePosition: input.coverMessagePosition === "right" ? "right" : "left",
    outroLayout: input.outroLayout === "stacked" ? "stacked" : "split",
    creditAuthor: String(input.creditAuthor || "").trim(),
    creditOrganization: String(input.creditOrganization || "").trim(),
    creditDate: String(input.creditDate || "").trim(),
    creditContact: String(input.creditContact || "").trim(),
    creditCta: String(input.creditCta || "").trim(),
    extraNote: String(input.extraNote || "").trim()
  };
}

async function persistDeck(deck: Deck, user = deck.userId ?? "default") {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error: deckError } = await supabase.from("decks").upsert({
    id: deck.id,
    basic_user: user,
    title: deck.title,
    purpose: deck.purpose,
    audience: deck.audience,
    mode: deck.mode,
    template_id: deck.templateId,
    settings: deck.settings,
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
