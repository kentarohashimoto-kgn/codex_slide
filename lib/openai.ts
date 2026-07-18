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
    result?: string;
    type?: string;
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
  if (!process.env.OPENAI_API_KEY) return createDemoDeck(input);

  try {
    const outline = await generateOutline(input);
    const template = getTemplate(input.templateId);
    const baseSlides: Slide[] = outline.slides.map((outlineSlide, index) => ({
      id: crypto.randomUUID(),
      pageNo: index + 1,
      section: outlineSlide.section,
      title: outlineSlide.title,
      summary: outlineSlide.summary,
      body: outlineSlide.body,
      speakerNotes: outlineSlide.speakerNotes ?? outlineSlide.summary,
      layoutType: outlineSlide.layoutType ?? inferLayoutType(index, outline.slides.length),
      status: "completed"
    }));
    const slides = await mapWithConcurrency(baseSlides, input.mode === "image" ? 2 : 4, async (base) => {
      const slide = enrichSlideForMode(base, input, template);

      if (input.mode === "image") {
        if (!isImageGenerationEnabled()) return slide;

        const generated = await generateImage(slide.imagePrompt ?? slide.title, input);
        return {
          ...slide,
          imageUrl: generated ?? slide.imageUrl
        };
      }

      const generatedHtml = await generateSlideHtml(slide, input);
      return {
        ...slide,
        htmlContent: generatedHtml.htmlContent,
        cssContent: generatedHtml.cssContent
      };
    });

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
    console.error("OpenAI generation failed", error);
    if (process.env.OPENAI_ALLOW_DEMO_FALLBACK === "true") return createDemoDeck(input);
    throw error;
  }
}

export async function regenerateSlide(deckInput: DeckGenerationRequest, slide: Slide): Promise<Slide> {
  const template = getTemplate(deckInput.templateId);
  const enriched = enrichSlideForMode({ ...slide, status: "completed" }, deckInput, template);

  if (!process.env.OPENAI_API_KEY) return enriched;

  if (deckInput.mode === "image") {
    if (!isImageGenerationEnabled()) return enriched;

    const generated = await generateImage(enriched.imagePrompt ?? enriched.title, deckInput);
    return {
      ...enriched,
      imageUrl: generated ?? enriched.imageUrl
    };
  }

  const generatedHtml = await generateSlideHtml(enriched, deckInput);
  return {
    ...enriched,
    htmlContent: generatedHtml.htmlContent,
    cssContent: generatedHtml.cssContent
  };
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

  const payload = await createTextResponse(prompt);
  const parsed = parseJsonObject<OutlinePayload>(extractResponseText(payload));

  if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
    throw new Error("OpenAI outline response did not include slides");
  }

  return {
    slides: parsed.slides.slice(0, input.slideCount)
  };
}

async function generateSlideHtml(slide: Slide, input: DeckGenerationRequest) {
  const template = getTemplate(input.templateId);
  const prompt = `
You are generating one finished HTML presentation slide for a production web preview.
Return strict JSON only with "htmlContent" and "cssContent".

Hard rules:
- Create actual slide-specific HTML and CSS. Do not return placeholder text.
- Do not include script, iframe, external CSS, external JS, external images, forms, video, audio, object, embed, or event handler attributes.
- The HTML must be a single <section class="ai-slide ai-slide-${slide.layoutType}">...</section>.
- Scope CSS to .ai-slide and descendants. Do not style body except within the slide.
- Keep text readable inside a ${input.aspectRatio} slide canvas.
- Use Japanese text when language is ja.
- Use page number/footer/credit settings exactly when requested.

Deck:
- Title: ${input.title}
- Purpose: ${input.purpose}
- Audience: ${input.audience}
- Tone: ${input.tone}
- Additional instruction: ${input.extraNote || "none"}

Template:
- Name: ${template.name}
- Description: ${template.description}
- Palette: ${JSON.stringify(template.palette)}
- Typography: ${JSON.stringify(template.typography)}
- Visual rules: ${template.visualRules.join("; ")}
- Avoid: ${template.negativeRules.join("; ")}

Settings:
- Aspect ratio: ${input.aspectRatio}
- Typography preset: ${input.typographyPreset}
- Text visibility: ${input.textVisibility}
- Brand color override: ${input.brandColor || "none"}
- Show page number: ${input.showPageNumber}
- Split pagination: ${input.splitPagination}
- Total pages: ${input.totalPages}
- Page number offset: ${input.pageNumberOffset}
- Show footer title: ${input.showFooterTitle}
- Cover message position: ${input.coverMessagePosition}
- Closing layout: ${input.outroLayout}
- Credits: ${[input.creditAuthor, input.creditOrganization, input.creditDate, input.creditContact].filter(Boolean).join(" / ") || "none"}
- CTA: ${input.creditCta || "none"}

Slide:
- Page: ${slide.pageNo} of ${input.slideCount}
- Section: ${slide.section}
- Layout type: ${slide.layoutType}
- Title: ${slide.title}
- Summary: ${slide.summary}
- Body: ${slide.body}
- Speaker notes: ${slide.speakerNotes}

JSON shape:
{
  "htmlContent": "<section class=\\"ai-slide ai-slide-benefit\\">...</section>",
  "cssContent": ".ai-slide { ... }"
}
`.trim();

  const payload = await createTextResponse(prompt);
  const parsed = parseJsonObject<{ htmlContent?: string; cssContent?: string }>(extractResponseText(payload));
  const htmlContent = sanitizeGeneratedHtml(parsed.htmlContent ?? slide.htmlContent ?? "");
  const cssContent = sanitizeGeneratedCss(parsed.cssContent ?? slide.cssContent ?? "");

  if (!htmlContent.includes("ai-slide")) {
    throw new Error(`OpenAI HTML response for slide ${slide.pageNo} did not include a slide section`);
  }

  return {
    htmlContent,
    cssContent: cssContent || slide.cssContent || ""
  };
}

async function createTextResponse(prompt: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TEXT_MODEL ?? "gpt-5.6",
      input: prompt
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI text request failed: ${response.status} ${await safeResponseText(response)}`);
  }

  return (await response.json()) as OpenAIResponsePayload;
}

async function generateImage(prompt: string, input: DeckGenerationRequest) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
      prompt,
      quality: process.env.OPENAI_IMAGE_QUALITY ?? "low",
      size: imageSizeFor(input.aspectRatio)
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI image request failed: ${response.status} ${await safeResponseText(response)}`);
  }

  const payload = (await response.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = payload.data?.[0]?.b64_json;
  return b64 ? `data:image/png;base64,${b64}` : null;
}

function isImageGenerationEnabled() {
  return process.env.OPENAI_IMAGE_GENERATION_ENABLED !== "false";
}

function imageSizeFor(aspectRatio: DeckGenerationRequest["aspectRatio"]) {
  if (aspectRatio === "4:3") return "1536x1152";
  if (aspectRatio === "1:1") return "1536x1536";
  return "1536x864";
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>) {
  const results: R[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function parseJsonObject<T>(text: string): T {
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0] ?? text;
  return JSON.parse(jsonText) as T;
}

function sanitizeGeneratedHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<(iframe|object|embed|form|video|audio)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");
}

function sanitizeGeneratedCss(value: string) {
  return value
    .replace(/@import[^;]+;/gi, "")
    .replace(/url\((?!['"]?data:image\/)/gi, "url(")
    .replace(/javascript:/gi, "");
}

async function safeResponseText(response: Response) {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "";
  }
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
