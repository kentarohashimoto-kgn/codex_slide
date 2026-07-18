"use client";

import { ChevronLeft, ChevronRight, FileText, RefreshCw } from "lucide-react";
import type { Deck, Slide } from "@/lib/types";

type DeckViewerProps = {
  deck: Deck | null;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onRegenerate: (slide: Slide) => void;
  regeneratingSlideId: string | null;
};

export function DeckViewer({ deck, selectedIndex, onSelect, onRegenerate, regeneratingSlideId }: DeckViewerProps) {
  if (!deck) {
    return (
      <div className="empty-state">
        <FileText size={32} />
        <h2>デッキを生成すると、ここにプレビューが表示されます</h2>
        <p>画像モードとHTMLモードは同じビューアで確認できます。</p>
      </div>
    );
  }

  const slide = deck.slides[selectedIndex] ?? deck.slides[0];
  const canPrev = selectedIndex > 0;
  const canNext = selectedIndex < deck.slides.length - 1;
  const aspectRatio = deck.settings?.aspectRatio === "4:3" ? "4 / 3" : deck.settings?.aspectRatio === "1:1" ? "1 / 1" : "16 / 9";

  return (
    <div className="deck-layout">
      <aside className="thumb-rail" aria-label="スライド一覧">
        <div className="rail-title">
          <strong>{deck.slides.length} slides</strong>
          <span>{deck.mode.toUpperCase()}</span>
        </div>
        <ol>
          {deck.slides.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                className={index === selectedIndex ? "thumb active" : "thumb"}
                onClick={() => onSelect(index)}
                aria-current={index === selectedIndex}
              >
                <span>{String(item.pageNo).padStart(2, "0")}</span>
                <strong>{item.title}</strong>
              </button>
            </li>
          ))}
        </ol>
      </aside>

      <div className="viewer-column">
        <div className="viewer-topbar">
          <div>
            <span className="eyebrow">{slide.section}</span>
            <h2>{slide.title}</h2>
          </div>
          <button className="ghost-button" type="button" onClick={() => onRegenerate(slide)} disabled={regeneratingSlideId === slide.id}>
            <RefreshCw className={regeneratingSlideId === slide.id ? "spin" : ""} size={17} />
            再生成
          </button>
        </div>

        <section className="stage-shell" style={{ aspectRatio }} aria-label="スライドプレビュー">
          {deck.mode === "image" ? <ImageSlide slide={slide} /> : <HtmlSlide slide={slide} />}
        </section>

        <nav className="slide-nav" aria-label="ページ移動">
          <button type="button" onClick={() => onSelect(selectedIndex - 1)} disabled={!canPrev}>
            <ChevronLeft size={18} />
            前へ
          </button>
          <span>
            {String(slide.pageNo).padStart(2, "0")} / {String(deck.slides.length).padStart(2, "0")}
          </span>
          <button type="button" onClick={() => onSelect(selectedIndex + 1)} disabled={!canNext}>
            次へ
            <ChevronRight size={18} />
          </button>
        </nav>

        <section className="slide-meta" aria-label="スライド情報">
          <div>
            <h3>本文</h3>
            <p>{slide.body}</p>
          </div>
          <div>
            <h3>ノート</h3>
            <p>{slide.speakerNotes}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function ImageSlide({ slide }: { slide: Slide }) {
  return slide.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="slide-image" src={slide.imageUrl} alt={`${slide.pageNo}: ${slide.title}`} />
  ) : (
    <div className="missing-slide">画像がまだ生成されていません</div>
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
