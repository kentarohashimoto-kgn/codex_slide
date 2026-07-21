import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { getShareAnalytics } from "@/lib/share-store";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const user = getRequestUser(request);
    const analytics = await getShareAnalytics(token, user);
    if (!analytics) return NextResponse.json({ error: "Share not found" }, { status: 404 });

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Share analytics failed" }, { status: 500 });
  }
}
