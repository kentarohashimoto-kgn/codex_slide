import { createDemoDeck, enrichSlideForMode } from "@/lib/demo";
import { getTemplate } from "@/lib/templates";
import type { Deck, DeckGenerationRequest, LayoutType, Slide } from "@/lib/types";

type OpenAIResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

type OutlinePayload = {
  slides: Array<{
    section: string;
    title: string;
    summary: string;
    body: string;
    speakerNotes?: string;
    layoutType?: LayoutType;
  }>;
};

export async function generateDeck(input: DeckGenerationRequest): Promise<Deck> {
  if (!process.env.OPENAI_API_KEY) {
    return createDemoDeck(input);
  }

  try {
    const outline = await generateOutline(input);
    const template = getTemplate(input.templateId);
    const slides: Slide[] = await Promise.all(
      outline.slides.map(async (outlineSlide, index) => {
        const base: Slide = {
          id: crypto.randomUUID(),
          pageNo: index + 1,
          section: outlineSlide.section,
          title: outlineSlide.title,
          summary: outlineSlide.summary,
          body: outlineSlide.body,
          speakerNotes: outlineSlide.speakerNotes ?? outlineSlide.summary,
          layoutType: outlineSlide.layoutType ?? inferLayoutType(index, outline.slides.length),
          status: "completed"
        };
        const slide = enrichSlideForMode(base, input, template);

        if (input.mode === "image" && process.env.OPENAI_IMAGE_GENERATION_ENABLED === "true") {
          const generated = await generateImage(slide.imagePrompt ?? slide.title);
          return {
            ...slide,
            imageUrl: generated ?? slide.imageUrl
          };
        }

        return slide;
      })
    );

    return {
      id: crypto.randomUUID(),
      title: input.title,
      purpose: input.purpose,
      audience: input.audience,
      language: input.language,
      mode: input.mode,
      templateId: input.templateId,
      settings: input,
      status: "completed",
      slideCount: slides.length,
      slides,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Falling back to demo deck after OpenAI generation failed", error);
    return createDemoDeck(input);
  }
}

export async function regenerateSlide(deckInput: DeckGenerationRequest, slide: Slide): Promise<Slide> {
  const template = getTemplate(deckInput.templateId);
  const enriched = enrichSlideForMode({ ...slide, status: "completed" }, deckInput, template);

  if (deckInput.mode === "image" && process.env.OPENAI_API_KEY && process.env.OPENAI_IMAGE_GENERATION_ENABLED === "true") {
    const generated = await generateImage(enriched.imagePrompt ?? enriched.title);
    return {
      ...enriched,
      imageUrl: generated ?? enriched.imageUrl
    };
  }

  return enriched;
}

async function generateOutline(input: DeckGenerationRequest): Promise<OutlinePayload> {
  const prompt = `
You are a senior Japanese B2B presentation designer.
Create a slide outline as strict JSON only.

Requirements:
- Language: ${input.language}
- Deck title: ${input.title}
- Purpose: ${input.purpose}
- Audience: ${input.audience}
- Slide count: ${input.slideCount}
- Mode: ${input.mode}
- Template source: ${input.templateSource}
- Template ID: ${input.templateId}
- Deck type: ${input.deckType}
- Chapter: ${input.deckType === "chapter" ? `${input.chapterIndex} of ${input.chapterTotal}` : "single deck"}
- Aspect ratio: ${input.aspectRatio}
- Typography preset: ${input.typographyPreset}
- Text visibility: ${input.textVisibility}
- Brand color: ${input.brandColor || "none"}
- Page numbers: ${input.showPageNumber ? "yes" : "no"}
- Split pagination: ${input.splitPagination ? `yes, total ${input.totalPages}, starts at ${input.pageNumberOffset}` : "no"}
- Repeat title in footer: ${input.showFooterTitle ? "yes" : "no"}
- Cover message position: ${input.coverMessagePosition}
- Closing layout: ${input.outroLayout}
- Credits: ${[input.creditAuthor, input.creditOrganization, input.creditDate, input.creditContact].filter(Boolean).join(" / ") || "none"}
- Final CTA: ${input.creditCta || "none"}
- Tone instructions: ${input.tone}
- Source material: ${input.material}
- Additional visual/content instruction: ${input.extraNote || "none"}

Return this JSON shape:
{
  "slides": [
    {
      "section": "INTRODUCTION",
      "title": "short slide title",
      "summary": "one sentence message",
      "body": "- point one\\n- point two\\n- point three",
      "speakerNotes": "short presenter note",
      "layoutType": "cover"
    }
  ]
}

Use layoutType values only from:
cover, agenda, comparison, process, benefit, use_case, safety, glossary, closing.
`.trim();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TEXT_MODEL ?? "gpt-5.6-terra",
      input: prompt
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI outline request failed: ${response.status}`);
  }

  const payload = (await response.json()) as OpenAIResponsePayload;
  const text = extractResponseText(payload);
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0] ?? text;
  const parsed = JSON.parse(jsonText) as OutlinePayload;

  if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
    throw new Error("OpenAI outline response did not include slides");
  }

  return {
    slides: parsed.slides.slice(0, input.slideCount)
  };
}

async function generateImage(prompt: string) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
      prompt,
      size: "1536x864",
      response_format: "b64_json"
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI image request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = payload.data?.[0]?.b64_json;
  return b64 ? `data:image/png;base64,${b64}` : null;
}

function extractResponseText(payload: OpenAIResponsePayload) {
  if (payload.output_text) return payload.output_text;
  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

function inferLayoutType(index: number, total: number): LayoutType {
  if (index === 0) return "cover";
  if (index === 1) return "agenda";
  if (index === total - 1) return "closing";
  if (index % 7 === 0) return "process";
  if (index % 5 === 0) return "comparison";
  return "benefit";
}
