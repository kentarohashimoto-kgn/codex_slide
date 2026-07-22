import { persistDeck } from "@/lib/deck-store";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { AspectRatio, Deck, DeckGenerationRequest, Slide } from "@/lib/types";

const importedSlideBucket = process.env.SUPABASE_SLIDE_UPLOAD_BUCKET || "imported-slide-images";

export function createImportedDeck(input: {
  user: string;
  title: string;
  sourceFileName: string;
  sourceMimeType: string;
  slideCount: number;
  aspectRatio: AspectRatio;
}): Deck {
  const now = new Date().toISOString();
  const title = input.title.trim() || removeFileExtension(input.sourceFileName) || "アップロード資料";

  return {
    id: crypto.randomUUID(),
    userId: input.user,
    title,
    purpose: `アップロード資料: ${input.sourceFileName}`,
    audience: "",
    language: "ja",
    mode: "image",
    templateId: "uploaded-file",
    settings: createImportedDeckSettings(title, input.slideCount, input.aspectRatio),
    status: "generating",
    slideCount: input.slideCount,
    slides: [],
    createdAt: now,
    updatedAt: now
  };
}

export function createImportedSlide(input: {
  deckId: string;
  pageNo: number;
  title?: string;
  imageUrl: string;
}): Slide {
  return {
    id: crypto.randomUUID(),
    pageNo: input.pageNo,
    section: "アップロード資料",
    title: input.title?.trim() || `Slide ${input.pageNo}`,
    summary: "アップロードされた資料から作成したスライド画像です。",
    body: "PDF/PPTXなど既存資料の取り込みスライドとして保存されています。",
    speakerNotes: "",
    layoutType: "benefit",
    imageUrl: input.imageUrl,
    status: "completed"
  };
}

export async function uploadImportedSlideImage(input: {
  user: string;
  deckId: string;
  pageNo: number;
  contentType: string;
  buffer: Buffer;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return `data:${input.contentType};base64,${input.buffer.toString("base64")}`;

  await ensureImportedSlideBucket();

  const extension = extensionForContentType(input.contentType);
  const objectPath = `${safePathSegment(input.user)}/${input.deckId}/slide-${String(input.pageNo).padStart(3, "0")}.${extension}`;
  const { error } = await supabase.storage.from(importedSlideBucket).upload(objectPath, input.buffer, {
    contentType: input.contentType,
    upsert: true,
    cacheControl: "31536000"
  });

  if (error) throw new Error(`Slide image upload failed: ${error.message}`);

  const { data } = supabase.storage.from(importedSlideBucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function persistImportedSlide(deckId: string, slide: Slide) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const now = new Date().toISOString();
  const { error: slideError } = await supabase.from("slides").upsert({
    id: slide.id,
    deck_id: deckId,
    page_no: slide.pageNo,
    section: slide.section,
    title: slide.title,
    summary: slide.summary,
    body: slide.body,
    speaker_notes: slide.speakerNotes,
    layout_type: slide.layoutType,
    image_url: slide.imageUrl,
    status: slide.status,
    updated_at: now
  });

  if (slideError) {
    console.warn("Supabase imported slide persist failed", slideError);
    return false;
  }

  await supabase.from("decks").update({ updated_at: now }).eq("id", deckId);
  return true;
}

export async function assertDeckBelongsToUser(deckId: string, user: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data, error } = await supabase
    .from("decks")
    .select("id")
    .eq("id", deckId)
    .eq("basic_user", user)
    .single();

  if (error || !data) throw new Error("Deck not found");
}

export async function completeImportedDeck(deckId: string, user: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("decks")
    .update({ status: "completed", updated_at: now })
    .eq("id", deckId)
    .eq("basic_user", user);

  if (updateError) throw new Error(`Deck completion failed: ${updateError.message}`);

  const { data, error } = await supabase
    .from("decks")
    .select("*, slides(*)")
    .eq("id", deckId)
    .eq("basic_user", user)
    .single();

  if (error || !data) throw new Error(error?.message || "Imported deck not found");

  const slides = ((data.slides ?? []) as Array<Record<string, unknown>>)
    .sort((a, b) => Number(a.page_no) - Number(b.page_no))
    .map((slide) => ({
      id: String(slide.id),
      pageNo: Number(slide.page_no),
      section: String(slide.section ?? ""),
      title: String(slide.title ?? ""),
      summary: String(slide.summary ?? ""),
      body: String(slide.body ?? ""),
      speakerNotes: String(slide.speaker_notes ?? ""),
      layoutType: "benefit" as const,
      imageUrl: String(slide.image_url ?? ""),
      status: "completed" as const
    }));

  return {
    id: String(data.id),
    userId: user,
    title: String(data.title),
    purpose: String(data.purpose ?? ""),
    audience: String(data.audience ?? ""),
    language: "ja",
    mode: "image" as const,
    templateId: String(data.template_id ?? "uploaded-file"),
    settings: (data.settings ?? undefined) as DeckGenerationRequest | undefined,
    status: "completed" as const,
    slideCount: Number(data.slide_count || slides.length),
    slides,
    createdAt: String(data.created_at),
    updatedAt: String(data.updated_at)
  };
}

export async function saveImportedDeckShell(deck: Deck, user: string) {
  return persistDeck(deck, user);
}

function createImportedDeckSettings(title: string, slideCount: number, aspectRatio: AspectRatio): DeckGenerationRequest {
  return {
    title,
    purpose: "既存資料のアップロード",
    audience: "",
    material: "",
    tone: "既存資料を忠実にプレビューする",
    slideCount,
    language: "ja",
    mode: "image",
    templateSource: "system",
    templateId: "uploaded-file",
    deckType: "single",
    chapterTotal: 1,
    chapterIndex: 1,
    aspectRatio,
    typographyPreset: "gothic",
    textVisibility: "standard",
    brandColor: "",
    showPageNumber: true,
    splitPagination: false,
    totalPages: slideCount,
    pageNumberOffset: 1,
    showFooterTitle: false,
    coverMessagePosition: "left",
    outroLayout: "split",
    creditAuthor: "",
    creditOrganization: "",
    creditDate: "",
    creditContact: "",
    creditCta: "",
    extraNote: ""
  };
}

async function ensureImportedSlideBucket() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data } = await supabase.storage.getBucket(importedSlideBucket);
  if (data) return;

  const { error } = await supabase.storage.createBucket(importedSlideBucket, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(`Storage bucket creation failed: ${error.message}`);
  }
}

function extensionForContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "default";
}

function removeFileExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}
