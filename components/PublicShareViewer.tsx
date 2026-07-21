"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, FileText } from "lucide-react";
import type { Deck, ShareAdConfig, Slide } from "@/lib/types";

type PublicSharePayload = {
  token: string;
  title: string;
  deck: Deck;
  adConfig: ShareAdConfig;
  updatedAt: string;
};

export function PublicShareViewer({ token }: { token: string }) {
  const [share, setShare] = useState<PublicSharePayload | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState("");
  const [viewerLabel, setViewerLabel] = useState<string | undefined>();

  useEffect(() => {
    setViewerId(getViewerId());
    setViewerLabel(new URLSearchParams(window.location.search).get("viewer") || undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadShare() {
      try {
        const response = await fetch(`/api/public-shares/${token}`, { cache: "no-store" });
        if (!response.ok) throw new Error("共有資料を読み込めませんでした。");
        const data = (await response.json()) as { share: PublicSharePayload };
        if (!cancelled) setShare(data.share);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "共有資料を読み込めませんでした。");
      }
    }

    loadShare();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const slide = share?.deck.slides[selectedIndex] ?? share?.deck.slides[0];

  useEffect(() => {
    if (!share || !slide || !viewerId) return;
    void sendShareEvent(token, {
      eventType: "page_view",
      pageNo: slide.pageNo,
      viewerId,
      viewerLabel,
      metadata: { title: slide.title }
    });
  }, [share, slide, token, viewerId, viewerLabel]);

  useEffect(() => {
    if (!share || !slide || !viewerId) return;
    const startedAt = Date.now();

    return () => {
      const durationMs = Date.now() - startedAt;
      if (durationMs < 500) return;

      void sendShareEvent(token, {
        eventType: "page_duration",
        pageNo: slide.pageNo,
        viewerId,
        viewerLabel,
        metadata: { title: slide.title, durationMs }
      });
    };
  }, [share, slide, token, viewerId, viewerLabel]);

  if (error) {
    return (
      <main className="public-viewer-shell">
        <div className="public-empty">
          <FileText size={36} />
          <h1>{error}</h1>
          <p>URLが正しいか、公開が停止されていないかをご確認ください。</p>
        </div>
      </main>
    );
  }

  if (!share || !slide) {
    return (
      <main className="public-viewer-shell">
        <div className="public-empty">
          <FileText size={36} />
          <h1>共有資料を読み込み中です</h1>
        </div>
      </main>
    );
  }

  const canPrev = selectedIndex > 0;
  const canNext = selectedIndex < share.deck.slides.length - 1;
  const aspectRatio = share.deck.settings?.aspectRatio === "4:3" ? "4 / 3" : share.deck.settings?.aspectRatio === "1:1" ? "1 / 1" : "16 / 9";

  return (
    <main className="public-viewer-shell">
      <header className="public-viewer-header">
        <div>
          <p className="eyebrow">SHARED DECK</p>
          <h1>{share.title}</h1>
        </div>
        <span>
          {String(slide.pageNo).padStart(2, "0")} / {String(share.deck.slides.length).padStart(2, "0")}
        </span>
      </header>

      <section className="public-viewer-layout">
        <aside className="public-thumb-rail" aria-label="共有スライド一覧">
          {share.deck.slides.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index === selectedIndex ? "active" : ""}
              onClick={() => setSelectedIndex(index)}
              aria-current={index === selectedIndex}
            >
              <span>{String(item.pageNo).padStart(2, "0")}</span>
              <strong>{item.title}</strong>
            </button>
          ))}
        </aside>

        <div className="public-stage-column">
          <section className="public-stage" style={{ aspectRatio }} aria-label="共有スライド">
            {share.deck.mode === "image" ? <ImageSlide slide={slide} /> : <HtmlSlide slide={slide} />}
          </section>
          <nav className="public-slide-nav" aria-label="ページ移動">
            <button type="button" onClick={() => setSelectedIndex((current) => Math.max(current - 1, 0))} disabled={!canPrev}>
              <ChevronLeft size={18} />
              前へ
            </button>
            <span>{slide.title}</span>
            <button
              type="button"
              onClick={() => setSelectedIndex((current) => Math.min(current + 1, share.deck.slides.length - 1))}
              disabled={!canNext}
            >
              次へ
              <ChevronRight size={18} />
            </button>
          </nav>
          <ShareAd token={token} adConfig={share.adConfig} pageNo={slide.pageNo} viewerId={viewerId} viewerLabel={viewerLabel} />
        </div>
      </section>
    </main>
  );
}

function ImageSlide({ slide }: { slide: Slide }) {
  return slide.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="slide-image" src={slide.imageUrl} alt={`${slide.pageNo}: ${slide.title}`} />
  ) : (
    <div className="missing-slide">画像がありません</div>
  );
}

function HtmlSlide({ slide }: { slide: Slide }) {
  const srcDoc = `
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <style>
    html, body { width: 100%; height: 100%; overflow: hidden; }
    ${slide.cssContent ?? ""}
  </style>
</head>
<body>${slide.htmlContent ?? ""}</body>
</html>`;

  return <iframe className="slide-frame" title={slide.title} sandbox="" srcDoc={srcDoc} />;
}

function ShareAd({
  token,
  adConfig,
  pageNo,
  viewerId,
  viewerLabel
}: {
  token: string;
  adConfig: ShareAdConfig;
  pageNo: number;
  viewerId: string;
  viewerLabel?: string;
}) {
  if (adConfig.kind === "none") return null;

  async function logClick() {
    await sendShareEvent(token, {
      eventType: "ad_click",
      pageNo,
      viewerId,
      viewerLabel,
      metadata: { linkUrl: adConfig.linkUrl, kind: adConfig.kind }
    });
  }

  const content =
    adConfig.kind === "image" && adConfig.imageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={adConfig.imageUrl} alt={adConfig.text || "告知"} />
    ) : (
      <strong>{adConfig.text || "お知らせ"}</strong>
    );

  if (!adConfig.linkUrl) {
    return <aside className="public-ad-slot">{content}</aside>;
  }

  return (
    <a className="public-ad-slot linked" href={adConfig.linkUrl} target="_blank" rel="noreferrer" onClick={() => void logClick()}>
      {content}
      <ExternalLink size={16} />
    </a>
  );
}

async function sendShareEvent(token: string, payload: Record<string, unknown>) {
  try {
    await fetch(`/api/public-shares/${token}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    });
  } catch {
    // Logging should never interrupt viewing.
  }
}

function getViewerId() {
  const key = "codex-slide:public-viewer-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next = crypto.randomUUID();
  window.localStorage.setItem(key, next);
  return next;
}
