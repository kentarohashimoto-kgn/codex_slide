import pptxgen from "pptxgenjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildSvgDataUrl } from "@/lib/demo";
import { getTemplate } from "@/lib/templates";
import type { AspectRatio, Deck, Slide } from "@/lib/types";

export async function buildDeckPptx(deck: Deck) {
  return buildDecksPptx([deck], deck.title || "deck");
}

export async function buildDecksPptx(decks: Deck[], title = "deck") {
  const exportableDecks = decks.filter((deck) => deck.slides.length > 0);
  if (exportableDecks.length === 0) {
    throw new Error("No slides to export");
  }

  const pptx = new pptxgen();
  const layout = exportableDecks[0]?.settings?.aspectRatio ?? "16:9";
  if (layout === "4:3") {
    pptx.layout = "LAYOUT_4X3";
  } else if (layout === "1:1") {
    pptx.defineLayout({ name: "LAYOUT_SQUARE", width: 7.5, height: 7.5 });
    pptx.layout = "LAYOUT_SQUARE";
  } else {
    pptx.layout = "LAYOUT_WIDE";
  }
  pptx.author = "Codex Slide";
  pptx.subject = exportableDecks.map((deck) => deck.title).join(" / ");
  pptx.title = title;
  pptx.company = "Codex Slide";
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos"
  };

  const slideSize = getSlideSize(layout);

  for (const deck of exportableDecks) {
    const template = getTemplate(deck.templateId);

    for (const deckSlide of deck.slides) {
      const slide = pptx.addSlide();
      slide.background = { color: template.palette.paper.replace("#", "") };
      const imageData = await resolveSlideImage(deckSlide, deck);

      slide.addImage({
        data: imageData,
        x: 0,
        y: 0,
        w: slideSize.w,
        h: slideSize.h
      });

      if (deckSlide.speakerNotes || exportableDecks.length > 1) {
        slide.addNotes([`Deck: ${deck.title}`, deckSlide.speakerNotes].filter(Boolean).join("\n\n"));
      }
    }
  }

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}

async function resolveSlideImage(slide: Slide, deck: Deck) {
  if (slide.imageUrl) {
    const embeddedImage = await tryReadImageData(slide.imageUrl);
    if (embeddedImage) return embeddedImage;
  }

  const template = getTemplate(deck.templateId);
  return buildSvgDataUrl(slide, template, deck.settings);
}

async function tryReadImageData(imageUrl: string) {
  if (imageUrl.startsWith("data:image")) return imageUrl;

  if (imageUrl.startsWith("/")) {
    const publicRoot = path.resolve(process.cwd(), "public");
    const imagePath = path.resolve(publicRoot, imageUrl.replace(/^\/+/, ""));
    if (!imagePath.startsWith(publicRoot + path.sep)) return null;

    const buffer = await readFile(imagePath);
    return `data:${mimeTypeFor(imagePath)};base64,${buffer.toString("base64")}`;
  }

  if (imageUrl.startsWith("https://") || imageUrl.startsWith("http://")) {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || mimeTypeFor(imageUrl);
    return `data:${contentType};base64,${Buffer.from(arrayBuffer).toString("base64")}`;
  }

  return null;
}

function getSlideSize(layout: AspectRatio) {
  if (layout === "4:3") return { w: 10, h: 7.5 };
  if (layout === "1:1") return { w: 7.5, h: 7.5 };
  return { w: 13.333, h: 7.5 };
}

function mimeTypeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "image/png";
}
