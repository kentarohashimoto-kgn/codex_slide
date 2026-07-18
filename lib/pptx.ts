import pptxgen from "pptxgenjs";
import { buildSvgDataUrl } from "@/lib/demo";
import { getTemplate } from "@/lib/templates";
import type { Deck } from "@/lib/types";

export async function buildDeckPptx(deck: Deck) {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Codex Slide";
  pptx.subject = deck.purpose;
  pptx.title = deck.title;
  pptx.company = "Codex Slide";
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos"
  };

  const template = getTemplate(deck.templateId);

  for (const deckSlide of deck.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: template.palette.paper.replace("#", "") };
    const imageData = deckSlide.imageUrl || buildSvgDataUrl(deckSlide, template);

    slide.addImage({
      data: imageData,
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5
    });

    if (deckSlide.speakerNotes) {
      slide.addNotes(deckSlide.speakerNotes);
    }
  }

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}
