"use client";

import { useMemo, useState } from "react";
import {
  Download,
  FileCode2,
  Image as ImageIcon,
  Loader2,
  MonitorPlay,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { templates } from "@/lib/templates";
import type { Deck, DeckGenerationRequest, DeckMode, Slide } from "@/lib/types";
import { DeckViewer } from "@/components/DeckViewer";

const initialInput: DeckGenerationRequest = {
  title: "Codexは、考えるだけで終わらない。",
  purpose: "Codexで資料作成を完成まで進められる価値を伝える",
  audience: "AI活用に興味がある初心者、営業・企画担当者",
  material: "調べる、作る、確かめるを一つの仕事として進める。画像生成モードとHTML生成モードを選べる。",
  tone: "初心者にもわかりやすく、紙質感のある図解、落ち着いたビジネス表現",
  slideCount: 18,
  language: "ja",
  mode: "html",
  templateId: templates[0].id
};

export function DeckBuilder() {
  const [input, setInput] = useState<DeckGenerationRequest>(initialInput);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [regeneratingSlideId, setRegeneratingSlideId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === input.templateId) ?? templates[0],
    [input.templateId]
  );

  async function generateDeck() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/decks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });

      if (!response.ok) throw new Error("生成に失敗しました");
      const data = (await response.json()) as { deck: Deck };
      setDeck(data.deck);
      setSelectedIndex(0);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  }

  async function regenerateSlide(slide: Slide) {
    if (!deck) return;
    setRegeneratingSlideId(slide.id);
    setError(null);

    try {
      const response = await fetch("/api/slides/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deckInput: input,
          slide,
          instruction: "現在のテンプレートとトンマナを保ちながら、より読みやすくする"
        })
      });

      if (!response.ok) throw new Error("スライド再生成に失敗しました");
      const data = (await response.json()) as { slide: Slide };
      setDeck({
        ...deck,
        slides: deck.slides.map((item) => (item.id === slide.id ? data.slide : item)),
        updatedAt: new Date().toISOString()
      });
    } catch (regenerationError) {
      setError(regenerationError instanceof Error ? regenerationError.message : "スライド再生成に失敗しました");
    } finally {
      setRegeneratingSlideId(null);
    }
  }

  async function exportPptx() {
    if (!deck) return;
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch("/api/decks/export-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deck)
      });

      if (!response.ok) throw new Error("PPTX出力に失敗しました");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${deck.title || "deck"}.pptx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "PPTX出力に失敗しました");
    } finally {
      setIsExporting(false);
    }
  }

  function setMode(mode: DeckMode) {
    setInput((current) => ({ ...current, mode }));
  }

  return (
    <main className="app-shell">
      <aside className="control-panel">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true" />
          <div>
            <p className="eyebrow">CODEX SLIDE</p>
            <h1>AIスライド生成</h1>
          </div>
        </div>

        <section className="field-group" aria-label="生成モード">
          <div className="segmented" role="tablist" aria-label="生成モード">
            <button
              type="button"
              className={input.mode === "image" ? "active" : ""}
              onClick={() => setMode("image")}
              aria-pressed={input.mode === "image"}
            >
              <ImageIcon size={17} />
              画像
            </button>
            <button
              type="button"
              className={input.mode === "html" ? "active" : ""}
              onClick={() => setMode("html")}
              aria-pressed={input.mode === "html"}
            >
              <FileCode2 size={17} />
              HTML
            </button>
          </div>
        </section>

        <section className="field-group" aria-label="デッキ設定">
          <label>
            タイトル
            <input value={input.title} onChange={(event) => setInput({ ...input, title: event.target.value })} />
          </label>
          <label>
            目的
            <textarea value={input.purpose} onChange={(event) => setInput({ ...input, purpose: event.target.value })} />
          </label>
          <label>
            対象読者
            <input value={input.audience} onChange={(event) => setInput({ ...input, audience: event.target.value })} />
          </label>
          <div className="compact-row">
            <label>
              枚数
              <input
                type="number"
                min={3}
                max={30}
                value={input.slideCount}
                onChange={(event) => setInput({ ...input, slideCount: Number(event.target.value) })}
              />
            </label>
            <label>
              言語
              <select value={input.language} onChange={(event) => setInput({ ...input, language: event.target.value })}>
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
          <label>
            材料
            <textarea
              className="large"
              value={input.material}
              onChange={(event) => setInput({ ...input, material: event.target.value })}
            />
          </label>
          <label>
            トンマナ
            <textarea value={input.tone} onChange={(event) => setInput({ ...input, tone: event.target.value })} />
          </label>
        </section>

        <section className="template-list" aria-label="テンプレート">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={template.id === input.templateId ? "template-option active" : "template-option"}
              onClick={() => setInput({ ...input, templateId: template.id })}
            >
              <span className="swatches" aria-hidden="true">
                <i style={{ background: template.palette.paper }} />
                <i style={{ background: template.palette.ink }} />
                <i style={{ background: template.palette.accent }} />
              </span>
              <strong>{template.name}</strong>
              <small>{template.description}</small>
            </button>
          ))}
        </section>

        <div className="action-row">
          <button className="primary-button" type="button" onClick={generateDeck} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            生成
          </button>
          <button className="icon-button" type="button" onClick={exportPptx} disabled={!deck || isExporting} title="PPTXをダウンロード">
            {isExporting ? <Loader2 className="spin" size={18} /> : <Download size={18} />}
          </button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        <div className="system-note">
          <MonitorPlay size={16} />
          <span>{input.mode === "image" ? "画像プレビュー" : "HTMLプレビュー"} / {selectedTemplate.name}</span>
        </div>
      </aside>

      <section className="workspace" aria-label="プレビュー">
        <DeckViewer
          deck={deck}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          onRegenerate={regenerateSlide}
          regeneratingSlideId={regeneratingSlideId}
        />
      </section>
    </main>
  );
}

