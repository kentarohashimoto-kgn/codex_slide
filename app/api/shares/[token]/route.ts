import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { updatePublicShare } from "@/lib/share-store";
import type { ShareAdConfig } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function PATCH(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const user = getRequestUser(request);
    const data = (await request.json()) as { adConfig?: ShareAdConfig; isPublic?: boolean };
    const share = await updatePublicShare(token, user, data);
    if (!share) return NextResponse.json({ error: "Share not found" }, { status: 404 });

    return NextResponse.json({ share });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Share update failed" }, { status: 500 });
  }
}
