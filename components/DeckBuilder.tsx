"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  Download,
  FileCode2,
  FolderOpen,
  Hash,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  MonitorPlay,
  Palette,
  SlidersHorizontal,
  Sparkles,
  Type,
  UserRound
} from "lucide-react";
import { getTemplatesBySource, templates } from "@/lib/templates";
import type { Deck, DeckGenerationRequest, DeckMode, Slide, TemplateSource } from "@/lib/types";
import { DeckViewer } from "@/components/DeckViewer";

const slideCountOptions = [5, 8, 10, 12, 15, 18, 24];

const initialInput: DeckGenerationRequest = {
  title: "Codexは、考えるだけで終わらない。",
  purpose: "Codexで資料作成を完成まで進められる価値を伝える",
  audience: "AI活用に興味がある初心者、営業・企画担当者",
  material: "調べる、作る、確かめるを一つの仕事として進める。画像生成モードとHTML生成モードを選べる。",
  tone: "初心者にもわかりやすく、紙質感のある図解、落ち着いたビジネス表現",
  slideCount: 18,
  language: "ja",
  mode: "html",
  templateSource: "system",
  templateId: templates[0].id,
  deckType: "single",
  chapterTotal: 3,
  chapterIndex: 1,
  aspectRatio: "16:9",
  typographyPreset: "gothic",
  textVisibility: "standard",
  brandColor: "",
  showPageNumber: true,
  splitPagination: false,
  totalPages: 18,
  pageNumberOffset: 1,
  showFooterTitle: true,
  coverMessagePosition: "left",
  outroLayout: "split",
  creditAuthor: "",
  creditOrganization: "",
  creditDate: "",
  creditContact: "",
  creditCta: "まず1本、実務で使える資料を作ってみる",
  extraNote: ""
};

export function DeckBuilder() {
  const [input, setInput] = useState<DeckGenerationRequest>(initialInput);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [regeneratingSlideId, setRegeneratingSlideId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState("default");
  const [savedDecks, setSavedDecks] = useState<Deck[]>([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const availableTemplates = useMemo(() => getTemplatesBySource(input.templateSource), [input.templateSource]);
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === input.templateId) ?? availableTemplates[0] ?? templates[0],
    [availableTemplates, input.templateId]
  );
  const pageEnd = input.pageNumberOffset + input.slideCount - 1;
  const pageNumberWarning = input.splitPagination && input.showPageNumber && pageEnd > input.totalPages;

  useEffect(() => {
    const user = readCookie("codex_slide_user") || "default";
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDecks() {
      setIsLoadingDecks(true);
      const localDecks = loadLocalDecks(currentUser);

      try {
        const [serverDecks, bundledDecks] = await Promise.all([fetchServerDecks(), fetchBundledDecks(currentUser)]);
        if (!cancelled) setSavedDecks(mergeDecks([...bundledDecks, ...serverDecks, ...localDecks]));
      } catch {
        if (!cancelled) setSavedDecks(localDecks);
      } finally {
        if (!cancelled) setIsLoadingDecks(false);
      }
    }

    loadDecks();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  async function generateDeck() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/decks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, totalPages: Math.max(input.totalPages, input.slideCount) })
      });

      if (!response.ok) throw new Error(await readErrorMessage(response, "生成に失敗しました"));
      const data = (await response.json()) as { deck: Deck };
      const generatedDeck = { ...data.deck, userId: currentUser };
      setDeck(generatedDeck);
      setSavedDecks((current) => {
        const next = mergeDecks([generatedDeck, ...current]).slice(0, 30);
        saveLocalDecks(currentUser, next);
        return next;
      });
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

      if (!response.ok) throw new Error(await readErrorMessage(response, "スライド再生成に失敗しました"));
      const data = (await response.json()) as { slide: Slide };
      const updatedDeck = {
        ...deck,
        slides: deck.slides.map((item) => (item.id === slide.id ? data.slide : item)),
        updatedAt: new Date().toISOString()
      };
      setDeck(updatedDeck);
      setSavedDecks((current) => {
        const next = mergeDecks([updatedDeck, ...current]).slice(0, 30);
        saveLocalDecks(currentUser, next);
        return next;
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

  function patchInput(patch: Partial<DeckGenerationRequest>) {
    setInput((current) => ({ ...current, ...patch }));
  }

  function setMode(mode: DeckMode) {
    patchInput({ mode });
  }

  function setTemplateSource(templateSource: TemplateSource) {
    const nextTemplates = getTemplatesBySource(templateSource);
    patchInput({ templateSource, templateId: nextTemplates[0]?.id ?? templates[0].id });
  }

  function openSavedDeck(savedDeck: Deck) {
    setDeck(savedDeck);
    setSelectedIndex(0);
    if (savedDeck.settings) setInput(savedDeck.settings);
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

        <section className="field-group deck-library" aria-label="マイフォルダ">
          <SectionTitle icon={<FolderOpen size={16} />} label="マイフォルダ" />
          <div className="user-folder">
            <UserRound size={15} />
            <span>{currentUser}</span>
            <small>{savedDecks.length}件</small>
          </div>
          <div className="saved-deck-list">
            {isLoadingDecks ? <p className="muted-text">読み込み中...</p> : null}
            {!isLoadingDecks && savedDecks.length === 0 ? <p className="muted-text">生成するとここに保存されます。</p> : null}
            {savedDecks.slice(0, 8).map((savedDeck) => (
              <button
                key={savedDeck.id}
                type="button"
                className={deck?.id === savedDeck.id ? "saved-deck active" : "saved-deck"}
                onClick={() => openSavedDeck(savedDeck)}
              >
                <strong>{savedDeck.title}</strong>
                <span>
                  {savedDeck.mode.toUpperCase()} / {savedDeck.slideCount}枚 / {formatDate(savedDeck.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="field-group" aria-label="生成モード">
          <SectionTitle icon={<MonitorPlay size={16} />} label="出力モード" />
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

        <section className="field-group" aria-label="基本情報">
          <SectionTitle icon={<SlidersHorizontal size={16} />} label="基本情報" />
          <label>
            タイトル
            <input value={input.title} onChange={(event) => patchInput({ title: event.target.value })} />
          </label>
          <label>
            目的
            <textarea value={input.purpose} onChange={(event) => patchInput({ purpose: event.target.value })} />
          </label>
          <label>
            対象読者
            <input value={input.audience} onChange={(event) => patchInput({ audience: event.target.value })} />
          </label>
          <label>
            材料
            <textarea className="large" value={input.material} onChange={(event) => patchInput({ material: event.target.value })} />
          </label>
          <label>
            トンマナ
            <textarea value={input.tone} onChange={(event) => patchInput({ tone: event.target.value })} />
          </label>
        </section>

        <section className="field-group" aria-label="ビジュアルスタイル">
          <SectionTitle icon={<Palette size={16} />} label="ビジュアルスタイル" />
          <div className="segmented source-tabs" role="tablist" aria-label="プリセット種別">
            <button
              type="button"
              className={input.templateSource === "system" ? "active" : ""}
              onClick={() => setTemplateSource("system")}
              aria-pressed={input.templateSource === "system"}
            >
              <LayoutTemplate size={17} />
              システム
            </button>
            <button
              type="button"
              className={input.templateSource === "company" ? "active" : ""}
              onClick={() => setTemplateSource("company")}
              aria-pressed={input.templateSource === "company"}
            >
              <Building2 size={17} />
              自社専用
            </button>
          </div>

          <div className="template-grid">
            {availableTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={template.id === input.templateId ? "template-card active" : "template-card"}
                onClick={() => patchInput({ templateId: template.id })}
              >
                <span className="template-preview" style={{ background: template.previewStyle.background }} aria-hidden="true">
                  <i style={{ background: template.previewStyle.block }} />
                  <b style={{ background: template.previewStyle.line }} />
                  <em style={{ borderColor: template.previewStyle.line }} />
                </span>
                <span className="swatches" aria-hidden="true">
                  <i style={{ background: template.palette.paper }} />
                  <i style={{ background: template.palette.ink }} />
                  <i style={{ background: template.palette.accent }} />
                </span>
                <strong>{template.name}</strong>
                <small>{template.description}</small>
                <span className="chip-row">
                  {template.moodKeywords.map((keyword) => (
                    <span key={keyword}>{keyword}</span>
                  ))}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="field-group" aria-label="枚数と形式">
          <SectionTitle icon={<Hash size={16} />} label="枚数と形式" />
          <div className="count-grid">
            {slideCountOptions.map((count) => (
              <button
                key={count}
                type="button"
                className={input.slideCount === count ? "active" : ""}
                onClick={() => patchInput({ slideCount: count, totalPages: Math.max(input.totalPages, count) })}
              >
                {count}
              </button>
            ))}
          </div>
          <div className="compact-row">
            <label>
              枚数
              <input
                type="number"
                min={1}
                max={30}
                value={input.slideCount}
                onChange={(event) => {
                  const slideCount = Number(event.target.value);
                  patchInput({ slideCount, totalPages: Math.max(input.totalPages, slideCount) });
                }}
              />
            </label>
            <label>
              言語
              <select value={input.language} onChange={(event) => patchInput({ language: event.target.value })}>
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>

          <div className="segmented three" role="tablist" aria-label="画像比率">
            {(["16:9", "4:3", "1:1"] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                className={input.aspectRatio === ratio ? "active" : ""}
                onClick={() => patchInput({ aspectRatio: ratio })}
                aria-pressed={input.aspectRatio === ratio}
              >
                {ratio}
              </button>
            ))}
          </div>

          <div className="segmented" role="tablist" aria-label="デッキタイプ">
            <button
              type="button"
              className={input.deckType === "single" ? "active" : ""}
              onClick={() => patchInput({ deckType: "single" })}
              aria-pressed={input.deckType === "single"}
            >
              単体
            </button>
            <button
              type="button"
              className={input.deckType === "chapter" ? "active" : ""}
              onClick={() => patchInput({ deckType: "chapter", splitPagination: true, showPageNumber: true })}
              aria-pressed={input.deckType === "chapter"}
            >
              章分割
            </button>
          </div>
          {input.deckType === "chapter" ? (
            <div className="compact-row">
              <label>
                全章数
                <input type="number" min={1} max={20} value={input.chapterTotal} onChange={(event) => patchInput({ chapterTotal: Number(event.target.value) })} />
              </label>
              <label>
                この章
                <input type="number" min={1} max={20} value={input.chapterIndex} onChange={(event) => patchInput({ chapterIndex: Number(event.target.value) })} />
              </label>
            </div>
          ) : null}
        </section>

        <section className="field-group" aria-label="詳細設定">
          <SectionTitle icon={<Type size={16} />} label="詳細設定" />
          <div className="segmented three" role="tablist" aria-label="書体">
            {[
              ["gothic", "ゴシック"],
              ["mincho", "明朝"],
              ["mono", "モノ"]
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={input.typographyPreset === value ? "active" : ""}
                onClick={() => patchInput({ typographyPreset: value as DeckGenerationRequest["typographyPreset"] })}
                aria-pressed={input.typographyPreset === value}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="segmented three" role="tablist" aria-label="文字の視認性">
            {[
              ["standard", "標準"],
              ["high", "強め"],
              ["compact", "密度"]
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={input.textVisibility === value ? "active" : ""}
                onClick={() => patchInput({ textVisibility: value as DeckGenerationRequest["textVisibility"] })}
                aria-pressed={input.textVisibility === value}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="compact-row">
            <label>
              ブランドカラー
              <input type="text" placeholder="#42c7b5" value={input.brandColor} onChange={(event) => patchInput({ brandColor: event.target.value })} />
            </label>
            <label>
              比率
              <select value={input.aspectRatio} onChange={(event) => patchInput({ aspectRatio: event.target.value as DeckGenerationRequest["aspectRatio"] })}>
                <option value="16:9">16:9</option>
                <option value="4:3">4:3</option>
                <option value="1:1">1:1</option>
              </select>
            </label>
          </div>

          <div className="toggle-list">
            <label className="checkbox-line">
              <input type="checkbox" checked={input.showPageNumber} onChange={(event) => patchInput({ showPageNumber: event.target.checked })} />
              ページ番号を入れる
            </label>
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={input.splitPagination}
                onChange={(event) => patchInput({ splitPagination: event.target.checked, showPageNumber: event.target.checked ? true : input.showPageNumber })}
              />
              章またぎ連番にする
            </label>
            <label className="checkbox-line">
              <input type="checkbox" checked={input.showFooterTitle} onChange={(event) => patchInput({ showFooterTitle: event.target.checked })} />
              フッターにタイトルを表示
            </label>
          </div>

          {input.splitPagination ? (
            <div className="compact-row">
              <label>
                全体ページ数
                <input type="number" min={input.slideCount} max={120} value={input.totalPages} onChange={(event) => patchInput({ totalPages: Number(event.target.value) })} />
              </label>
              <label>
                開始ページ
                <input type="number" min={1} max={120} value={input.pageNumberOffset} onChange={(event) => patchInput({ pageNumberOffset: Number(event.target.value) })} />
              </label>
            </div>
          ) : null}
          {pageNumberWarning ? <p className="warning-text">開始ページと枚数が全体ページ数を超えています。</p> : null}

          <div className="segmented" role="tablist" aria-label="表紙メッセージ位置">
            <button
              type="button"
              className={input.coverMessagePosition === "left" ? "active" : ""}
              onClick={() => patchInput({ coverMessagePosition: "left" })}
              aria-pressed={input.coverMessagePosition === "left"}
            >
              表紙左
            </button>
            <button
              type="button"
              className={input.coverMessagePosition === "right" ? "active" : ""}
              onClick={() => patchInput({ coverMessagePosition: "right" })}
              aria-pressed={input.coverMessagePosition === "right"}
            >
              表紙右
            </button>
          </div>
          <div className="segmented" role="tablist" aria-label="最終枚レイアウト">
            <button
              type="button"
              className={input.outroLayout === "split" ? "active" : ""}
              onClick={() => patchInput({ outroLayout: "split" })}
              aria-pressed={input.outroLayout === "split"}
            >
              最終左右
            </button>
            <button
              type="button"
              className={input.outroLayout === "stacked" ? "active" : ""}
              onClick={() => patchInput({ outroLayout: "stacked" })}
              aria-pressed={input.outroLayout === "stacked"}
            >
              最終上下
            </button>
          </div>

          <div className="compact-row">
            <label>
              作成者
              <input value={input.creditAuthor} onChange={(event) => patchInput({ creditAuthor: event.target.value })} />
            </label>
            <label>
              所属
              <input value={input.creditOrganization} onChange={(event) => patchInput({ creditOrganization: event.target.value })} />
            </label>
          </div>
          <div className="compact-row">
            <label>
              日付
              <input value={input.creditDate} onChange={(event) => patchInput({ creditDate: event.target.value })} />
            </label>
            <label>
              連絡先
              <input value={input.creditContact} onChange={(event) => patchInput({ creditContact: event.target.value })} />
            </label>
          </div>
          <label>
            CTA
            <input value={input.creditCta} onChange={(event) => patchInput({ creditCta: event.target.value })} />
          </label>
          <label>
            追加指示
            <textarea value={input.extraNote} onChange={(event) => patchInput({ extraNote: event.target.value })} />
          </label>
        </section>

        <div className="action-row">
          <button className="primary-button" type="button" onClick={generateDeck} disabled={isGenerating || pageNumberWarning}>
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
          <span>
            {input.mode === "image" ? "画像プレビュー" : "HTMLプレビュー"} / {selectedTemplate.name} / {input.slideCount}枚
          </span>
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

function SectionTitle({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="section-title">
      {icon}
      <span>{label}</span>
    </div>
  );
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

async function fetchServerDecks() {
  const response = await fetch("/api/decks", { cache: "no-store" });
  const data = response.ok ? ((await response.json()) as { decks?: Deck[] }) : { decks: [] };
  return data.decks ?? [];
}

async function fetchBundledDecks(user: string) {
  const bundledPaths = ["/generated-decks/kojima-material-poc/deck.json"];
  const decks: Array<Deck | null> = await Promise.all(
    bundledPaths.map(async (path) => {
      try {
        const response = await fetch(path, { cache: "no-store" });
        if (!response.ok) return null;
        const deck = (await response.json()) as Deck;
        return { ...deck, userId: user };
      } catch {
        return null;
      }
    })
  );

  return decks.filter((deck): deck is Deck => deck !== null);
}

function storageKey(user: string) {
  return `codex-slide:decks:${user}`;
}

function loadLocalDecks(user: string) {
  try {
    const raw = window.localStorage.getItem(storageKey(user));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Deck[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalDecks(user: string, decks: Deck[]) {
  try {
    window.localStorage.setItem(storageKey(user), JSON.stringify(decks.map(slimDeckForLocalStorage)));
  } catch {
    try {
      window.localStorage.setItem(storageKey(user), JSON.stringify(decks.slice(0, 10).map(slimDeckForLocalStorage)));
    } catch {
      console.warn("Local deck library save failed");
    }
  }
}

function slimDeckForLocalStorage(deck: Deck): Deck {
  return {
    ...deck,
    slides: deck.slides.map((slide) => ({
      ...slide,
      imageUrl: slide.imageUrl?.startsWith("data:image") ? undefined : slide.imageUrl
    }))
  };
}

function mergeDecks(decks: Deck[]) {
  const map = new Map<string, Deck>();
  for (const deck of decks) {
    const existing = map.get(deck.id);
    if (!existing || new Date(deck.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
      map.set(deck.id, deck);
    }
  }

  return [...map.values()].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function readCookie(name: string) {
  const item = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
