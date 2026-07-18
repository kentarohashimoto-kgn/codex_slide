import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Deck, DeckMode, DeckStatus, LayoutType, Slide, SlideStatus } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type DeckRow = {
  id: string;
  title: string;
  purpose: string | null;
  audience: string | null;
  mode: DeckMode;
  template_id: string;
  settings: Deck["settings"] | null;
  status: DeckStatus;
  slide_count: number;
  created_at: string;
  updated_at: string;
  slides?: SlideRow[];
};

type SlideRow = {
  id: string;
  page_no: number;
  section: string | null;
  title: string;
  summary: string | null;
  body: string | null;
  speaker_notes: string | null;
  layout_type: LayoutType | null;
  html_content: string | null;
  css_content: string | null;
  image_url: string | null;
  prompt: string | null;
  status: SlideStatus;
};

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ decks: [] });

  const user = getRequestUser(request);
  const { data, error } = await supabase
    .from("decks")
    .select("*, slides(*)")
    .eq("basic_user", user)
    .order("updated_at", { ascending: false })
    .order("page_no", { foreignTable: "slides", ascending: true });

  if (error) {
    console.warn("Supabase deck list failed", error);
    return NextResponse.json({ decks: [] });
  }

  return NextResponse.json({ decks: (data as DeckRow[]).map((deck) => mapDeck(deck, user)) });
}

function mapDeck(deck: DeckRow, user: string): Deck {
  return {
    id: deck.id,
    userId: user,
    title: deck.title,
    purpose: deck.purpose ?? "",
    audience: deck.audience ?? "",
    language: deck.settings?.language ?? "ja",
    mode: deck.mode,
    templateId: deck.template_id,
    settings: deck.settings ?? undefined,
    status: deck.status,
    slideCount: deck.slide_count,
    slides: (deck.slides ?? []).sort((a, b) => a.page_no - b.page_no).map(mapSlide),
    createdAt: deck.created_at,
    updatedAt: deck.updated_at
  };
}

function mapSlide(slide: SlideRow): Slide {
  return {
    id: slide.id,
    pageNo: slide.page_no,
    section: slide.section ?? "",
    title: slide.title,
    summary: slide.summary ?? "",
    body: slide.body ?? "",
    speakerNotes: slide.speaker_notes ?? "",
    layoutType: slide.layout_type ?? "benefit",
    htmlContent: slide.html_content ?? undefined,
    cssContent: slide.css_content ?? undefined,
    imageUrl: slide.image_url ?? undefined,
    imagePrompt: slide.prompt ?? undefined,
    status: slide.status
  };
}
