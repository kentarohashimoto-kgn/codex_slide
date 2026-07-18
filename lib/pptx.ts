import pptxgen from "pptxgenjs";
import { buildSvgDataUrl } from "@/lib/demo";
import { getTemplate } from "@/lib/templates";
import type { Deck } from "@/lib/types";

export async function buildDeckPptx(deck: Deck) {
  const pptx = new pptxgen();
  const layout = deck.settings?.aspectRatio ?? "16:9";
  if (layout === "4:3") {
    pptx.layout = "LAYOUT_4X3";
  } else if (layout === "1:1") {
    pptx.defineLayout({ name: "LAYOUT_SQUARE", width: 7.5, height: 7.5 });
    pptx.layout = "LAYOUT_SQUARE";
  } else {
    pptx.layout = "LAYOUT_WIDE";
  }
  pptx.author = "Codex Slide";
  pptx.subject = deck.purpose;
  pptx.title = deck.title;
  pptx.company = "Codex Slide";
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos"
  };

  const template = getTemplate(deck.templateId);
  const slideSize = layout === "4:3" ? { w: 10, h: 7.5 } : layout === "1:1" ? { w: 7.5, h: 7.5 } : { w: 13.333, h: 7.5 };

  for (const deckSlide of deck.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: template.palette.paper.replace("#", "") };
    const imageData = deckSlide.imageUrl || buildSvgDataUrl(deckSlide, template, deck.settings);

    slide.addImage({
      data: imageData,
      x: 0,
      y: 0,
      w: slideSize.w,
      h: slideSize.h
    });

    if (deckSlide.speakerNotes) {
      slide.addNotes(deckSlide.speakerNotes);
    }
  }

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}
