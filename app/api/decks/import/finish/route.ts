import { NextResponse } from "next/server";
import { completeImportedDeck } from "@/lib/imported-decks";
import { getRequestUser } from "@/lib/request-user";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = getRequestUser(request);
    const data = (await request.json()) as { deckId?: string };
    const deckId = String(data.deckId || "");

    if (!deckId) return NextResponse.json({ error: "Deck ID is required" }, { status: 400 });

    const deck = await completeImportedDeck(deckId, user);
    return NextResponse.json({ deck });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import finish failed" },
      { status: 500 }
    );
  }
}

