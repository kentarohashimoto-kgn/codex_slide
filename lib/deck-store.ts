import { getSupabaseAdmin } from "@/lib/supabase";
import type { Deck } from "@/lib/types";

export async function persistDeck(deck: Deck, user = deck.userId ?? "default") {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

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
    return false;
  }

  if (deck.slides.length === 0) return true;

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

  if (slidesError) {
    console.warn("Supabase slide persist failed", slidesError);
    return false;
  }

  return true;
}

