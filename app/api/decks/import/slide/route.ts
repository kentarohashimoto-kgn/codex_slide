import { NextResponse } from "next/server";
import { createImportedSlide, persistImportedSlide, uploadImportedSlideImage } from "@/lib/imported-decks";
import { getRequestUser } from "@/lib/request-user";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const user = getRequestUser(request);
    const deckId = String(formData.get("deckId") || "");
    const pageNo = Number(formData.get("pageNo") || 0);
    const title = String(formData.get("title") || "");
    const image = formData.get("image");

    if (!deckId || !Number.isFinite(pageNo) || pageNo < 1) {
      return NextResponse.json({ error: "Deck ID and page number are required" }, { status: 400 });
    }
    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Slide image is required" }, { status: 400 });
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
      return NextResponse.json({ error: "Slide image must be JPEG, PNG, or WebP" }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const imageUrl = await uploadImportedSlideImage({
      user,
      deckId,
      pageNo,
      contentType: image.type,
      buffer
    });
    const slide = createImportedSlide({ deckId, pageNo, title, imageUrl });

    await persistImportedSlide(deckId, slide);
    return NextResponse.json({ slide });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Slide import failed" },
      { status: 500 }
    );
  }
}
