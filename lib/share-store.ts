import crypto from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Deck, PublicShare, PublicShareSummary, ShareAdConfig, ShareAnalytics } from "@/lib/types";

type ShareRow = {
  id: string;
  token: string;
  basic_user: string;
  deck_id: string;
  title: string;
  deck_snapshot: Deck;
  ad_config: ShareAdConfig | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

type EventRow = {
  event_type: "page_view" | "page_duration" | "ad_click";
  page_no: number | null;
  viewer_id: string | null;
  viewer_label: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

type ShareEventInput = {
  eventType: "page_view" | "page_duration" | "ad_click";
  pageNo: number;
  viewerId: string;
  viewerLabel?: string;
  metadata?: Record<string, unknown>;
};

const fallbackShares = new Map<string, PublicShare>();
const fallbackEvents = new Map<string, EventRow[]>();
const fallbackRoot = path.join(process.cwd(), ".tmp", "public-share-store");

export function isSharePersistenceConfigured() {
  return Boolean(getSupabaseAdmin()) || process.env.NODE_ENV === "development";
}

export async function createPublicShare(deck: Deck, basicUser: string, adConfig: ShareAdConfig) {
  const token = createShareToken();
  const now = new Date().toISOString();
  const share: PublicShare = {
    token,
    basicUser,
    deckId: deck.id,
    title: deck.title,
    deck,
    adConfig: normalizeAdConfig(adConfig),
    isPublic: true,
    createdAt: now,
    updatedAt: now
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    if (process.env.NODE_ENV !== "development") throw new Error("Supabase is not configured");
    await writeFallbackShare(share);
    return share;
  }

  const { data, error } = await supabase
    .from("public_shares")
    .insert({
      token,
      basic_user: basicUser,
      deck_id: deck.id,
      title: deck.title,
      deck_snapshot: deck,
      ad_config: share.adConfig,
      is_public: true
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapShare(data as ShareRow);
}

export async function listPublicShares(basicUser: string): Promise<PublicShareSummary[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const shares = await readFallbackShares();
    return shares
      .filter((share) => share.basicUser === basicUser)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((share) => summarizeShare(share, readFallbackEventsFromCache(share.token)));
  }

  const { data, error } = await supabase
    .from("public_shares")
    .select("*, share_view_events(event_type, viewer_id)")
    .eq("basic_user", basicUser)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  return ((data ?? []) as Array<ShareRow & { share_view_events?: Array<Pick<EventRow, "event_type" | "viewer_id">> }>).map((row) => {
    const events = row.share_view_events ?? [];
    const views = events.filter((event) => event.event_type === "page_view");
    return {
      token: row.token,
      deckId: row.deck_id,
      title: row.title,
      slideCount: row.deck_snapshot?.slides?.length ?? 0,
      isPublic: row.is_public,
      adConfig: normalizeAdConfig(row.ad_config ?? {}),
      viewCount: views.length,
      viewerCount: new Set(views.map((event) => event.viewer_id).filter(Boolean)).size,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  });
}

export async function getPublicShare(token: string, includePrivate = false) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const share = await readFallbackShare(token);
    return share && (includePrivate || share.isPublic) ? share : null;
  }

  const query = supabase.from("public_shares").select("*").eq("token", token);
  const { data, error } = await (includePrivate ? query : query.eq("is_public", true)).maybeSingle();
  if (error) throw error;
  return data ? mapShare(data as ShareRow) : null;
}

export async function updatePublicShare(token: string, basicUser: string, patch: { adConfig?: ShareAdConfig; isPublic?: boolean }) {
  const supabase = getSupabaseAdmin();
  const existing = await getPublicShare(token, true);
  if (!existing || existing.basicUser !== basicUser) return null;

  if (!supabase) {
    const updated = {
      ...existing,
      adConfig: patch.adConfig ? normalizeAdConfig(patch.adConfig) : existing.adConfig,
      isPublic: patch.isPublic ?? existing.isPublic,
      updatedAt: new Date().toISOString()
    };
    await writeFallbackShare(updated);
    return updated;
  }

  const { data, error } = await supabase
    .from("public_shares")
    .update({
      ad_config: patch.adConfig ? normalizeAdConfig(patch.adConfig) : existing.adConfig,
      is_public: patch.isPublic ?? existing.isPublic,
      updated_at: new Date().toISOString()
    })
    .eq("token", token)
    .eq("basic_user", basicUser)
    .select("*")
    .single();

  if (error) throw error;
  return mapShare(data as ShareRow);
}

export async function logShareEvent(token: string, input: ShareEventInput, request: Request) {
  const share = await getPublicShare(token);
  if (!share) return null;

  const event: EventRow = {
    event_type: input.eventType,
    page_no: input.pageNo,
    viewer_id: input.viewerId,
    viewer_label: input.viewerLabel ?? null,
    metadata: input.metadata ?? {},
    created_at: new Date().toISOString()
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    await writeFallbackEvent(token, event);
    return event;
  }

  const { error } = await supabase.from("share_view_events").insert({
    share_token: token,
    event_type: input.eventType,
    page_no: input.pageNo,
    viewer_id: input.viewerId,
    viewer_label: input.viewerLabel ?? null,
    metadata: input.metadata ?? {},
    user_agent: request.headers.get("user-agent"),
    referrer: request.headers.get("referer"),
    ip_hash: hashIp(request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "")
  });

  if (error) throw error;
  return event;
}

export async function getShareAnalytics(token: string, basicUser: string): Promise<ShareAnalytics | null> {
  const share = await getPublicShare(token, true);
  if (!share || share.basicUser !== basicUser) return null;

  const supabase = getSupabaseAdmin();
  let events: EventRow[] = await readFallbackEvents(token);

  if (supabase) {
    const { data, error } = await supabase
      .from("share_view_events")
      .select("event_type, page_no, viewer_id, viewer_label, metadata, created_at")
      .eq("share_token", token)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    events = (data ?? []) as EventRow[];
  }

  return buildAnalytics(share, events);
}

function buildAnalytics(share: PublicShare, events: EventRow[]): ShareAnalytics {
  const pageViewEvents = events.filter((event) => event.event_type === "page_view");
  const durationEvents = events.filter((event) => event.event_type === "page_duration");
  const pageViews = share.deck.slides.map((slide) => {
    const slideEvents = pageViewEvents.filter((event) => event.page_no === slide.pageNo);
    const slideDurationEvents = durationEvents.filter((event) => event.page_no === slide.pageNo);
    return {
      pageNo: slide.pageNo,
      title: slide.title,
      views: slideEvents.length,
      uniqueViewers: new Set(slideEvents.map((event) => event.viewer_id).filter(Boolean)).size,
      totalSeconds: Math.round(
        slideDurationEvents.reduce((total, event) => total + Number(event.metadata?.durationMs ?? 0), 0) / 1000
      )
    };
  });

  return {
    token: share.token,
    title: share.title,
    totalViews: pageViewEvents.length,
    uniqueViewers: new Set(pageViewEvents.map((event) => event.viewer_id).filter(Boolean)).size,
    adClicks: events.filter((event) => event.event_type === "ad_click").length,
    pageViews,
    recentEvents: events.slice(0, 20).map((event) => ({
      eventType: event.event_type,
      pageNo: event.page_no ?? 0,
      viewerId: event.viewer_id ?? "anonymous",
      viewerLabel: event.viewer_label ?? undefined,
      createdAt: event.created_at
    }))
  };
}

function mapShare(row: ShareRow): PublicShare {
  return {
    token: row.token,
    basicUser: row.basic_user,
    deckId: row.deck_id,
    title: row.title,
    deck: row.deck_snapshot,
    adConfig: normalizeAdConfig(row.ad_config ?? {}),
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function summarizeShare(share: PublicShare, events: EventRow[]): PublicShareSummary {
  const views = events.filter((event) => event.event_type === "page_view");
  return {
    token: share.token,
    deckId: share.deckId,
    title: share.title,
    slideCount: share.deck.slides.length,
    isPublic: share.isPublic,
    adConfig: share.adConfig,
    viewCount: views.length,
    viewerCount: new Set(views.map((event) => event.viewer_id).filter(Boolean)).size,
    createdAt: share.createdAt,
    updatedAt: share.updatedAt
  };
}

function normalizeAdConfig(adConfig: Partial<ShareAdConfig>): ShareAdConfig {
  const kind = adConfig.kind === "image" || adConfig.kind === "text" ? adConfig.kind : "none";
  return {
    kind,
    text: adConfig.text?.trim() || "",
    imageUrl: adConfig.imageUrl?.trim() || "",
    linkUrl: adConfig.linkUrl?.trim() || ""
  };
}

function createShareToken() {
  return crypto.randomBytes(12).toString("base64url");
}

function hashIp(value: string) {
  if (!value) return "";
  return crypto.createHash("sha256").update(`${value}:${process.env.BASIC_AUTH_USERNAME ?? "codex-slide"}`).digest("hex");
}

async function writeFallbackShare(share: PublicShare) {
  await mkdir(fallbackRoot, { recursive: true });
  fallbackShares.set(share.token, share);
  await writeFile(path.join(fallbackRoot, `${share.token}.json`), JSON.stringify(share), "utf8");
  if (!fallbackEvents.has(share.token)) fallbackEvents.set(share.token, []);
}

async function readFallbackShare(token: string) {
  const cached = fallbackShares.get(token);
  if (cached) return cached;

  try {
    const raw = await readFile(path.join(fallbackRoot, `${token}.json`), "utf8");
    const share = JSON.parse(raw) as PublicShare;
    fallbackShares.set(token, share);
    return share;
  } catch {
    return null;
  }
}

async function readFallbackShares() {
  try {
    await mkdir(fallbackRoot, { recursive: true });
    const files = await readdir(fallbackRoot);
    const shares = await Promise.all(
      files
        .filter((file) => file.endsWith(".json") && !file.endsWith(".events.json"))
        .map(async (file) => readFallbackShare(file.replace(/\.json$/, "")))
    );
    return shares.filter((share): share is PublicShare => share !== null);
  } catch {
    return [];
  }
}

async function writeFallbackEvent(token: string, event: EventRow) {
  await mkdir(fallbackRoot, { recursive: true });
  const events = [...(await readFallbackEvents(token)), event];
  fallbackEvents.set(token, events);
  await writeFile(path.join(fallbackRoot, `${token}.events.json`), JSON.stringify(events), "utf8");
}

async function readFallbackEvents(token: string) {
  const cached = fallbackEvents.get(token);
  if (cached) return cached;

  try {
    const raw = await readFile(path.join(fallbackRoot, `${token}.events.json`), "utf8");
    const events = JSON.parse(raw) as EventRow[];
    fallbackEvents.set(token, events);
    return events;
  } catch {
    fallbackEvents.set(token, []);
    return [];
  }
}

function readFallbackEventsFromCache(token: string) {
  return fallbackEvents.get(token) ?? [];
}
