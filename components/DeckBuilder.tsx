"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BarChart3,
  Building2,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FolderOpen,
  Hash,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  MonitorPlay,
  Palette,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Type,
  UploadCloud,
  UserRound
} from "lucide-react";
import { getTemplatesBySource, templates } from "@/lib/templates";
import type { AspectRatio, Deck, DeckGenerationRequest, DeckMode, PublicShareSummary, ShareAdConfig, ShareAnalytics, Slide, TemplateSource } from "@/lib/types";
import { DeckViewer } from "@/components/DeckViewer";
import type { PDFPageProxy } from "pdfjs-dist";

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
  const [isExportingBundle, setIsExportingBundle] = useState(false);
  const [regeneratingSlideId, setRegeneratingSlideId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState("default");
  const [savedDecks, setSavedDecks] = useState<Deck[]>([]);
  const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>([]);
  const [publicShares, setPublicShares] = useState<PublicShareSummary[]>([]);
  const [currentShare, setCurrentShare] = useState<PublicShareSummary | null>(null);
  const [shareAnalytics, setShareAnalytics] = useState<ShareAnalytics | null>(null);
  const [shareAdConfig, setShareAdConfig] = useState<ShareAdConfig>({ kind: "none", text: "", imageUrl: "", linkUrl: "" });
  const [isSharing, setIsSharing] = useState(false);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const deepLinkLoadedRef = useRef(false);

  const availableTemplates = useMemo(() => getTemplatesBySource(input.templateSource), [input.templateSource]);
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === input.templateId) ?? availableTemplates[0] ?? templates[0],
    [availableTemplates, input.templateId]
  );
  const visibleSavedDecks = useMemo(() => savedDecks.slice(0, 8), [savedDecks]);
  const selectedFolderDecks = useMemo(
    () => savedDecks.filter((savedDeck) => selectedDeckIds.includes(savedDeck.id)),
    [savedDecks, selectedDeckIds]
  );
  const selectedFolderSlideCount = selectedFolderDecks.reduce((total, savedDeck) => total + savedDeck.slides.length, 0);
  const isAllVisibleSelected =
    visibleSavedDecks.length > 0 && visibleSavedDecks.every((savedDeck) => selectedDeckIds.includes(savedDeck.id));
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

  useEffect(() => {
    let cancelled = false;

    async function loadShares() {
      const shares = await fetchPublicShares();
      if (!cancelled) setPublicShares(shares);
    }

    loadShares();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (deepLinkLoadedRef.current || isLoadingDecks || savedDecks.length === 0) return;

    const deckId = new URLSearchParams(window.location.search).get("deck");
    if (!deckId) return;

    const deepLinkedDeck = savedDecks.find((savedDeck) => savedDeck.id === deckId);
    if (!deepLinkedDeck) return;

    deepLinkLoadedRef.current = true;
    setDeck(deepLinkedDeck);
    setSelectedIndex(readInitialPageIndex(deepLinkedDeck.slides.length));
    if (deepLinkedDeck.settings) setInput(deepLinkedDeck.settings);
  }, [isLoadingDecks, savedDecks]);

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

  async function exportSelectedDecks() {
    if (selectedFolderDecks.length === 0) return;
    setIsExportingBundle(true);
    setError(null);

    try {
      const title =
        selectedFolderDecks.length === 1
          ? selectedFolderDecks[0].title
          : `Codex Slideまとめ_${new Date().toISOString().slice(0, 10)}`;
      const response = await fetch("/api/decks/export-bundle-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, decks: selectedFolderDecks })
      });

      if (!response.ok) throw new Error(await readErrorMessage(response, "選択したスライドセットのPPTX出力に失敗しました"));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title}.pptx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "選択したスライドセットのPPTX出力に失敗しました");
    } finally {
      setIsExportingBundle(false);
    }
  }

  async function createShareLink() {
    if (!deck) return;
    setIsSharing(true);
    setError(null);

    try {
      const response = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deck, adConfig: { kind: "none" } })
      });

      if (!response.ok) throw new Error(await readErrorMessage(response, "共有リンクの作成に失敗しました"));
      const data = (await response.json()) as { share: { token: string; title: string; deckId: string; deck: Deck; adConfig: ShareAdConfig; isPublic: boolean; createdAt: string; updatedAt: string } };
      const summary = {
        token: data.share.token,
        deckId: data.share.deckId,
        title: data.share.title,
        slideCount: data.share.deck.slides.length,
        isPublic: data.share.isPublic,
        adConfig: data.share.adConfig,
        viewCount: 0,
        viewerCount: 0,
        createdAt: data.share.createdAt,
        updatedAt: data.share.updatedAt
      };
      setCurrentShare(summary);
      setShareAdConfig(summary.adConfig);
      setPublicShares((current) => [summary, ...current.filter((share) => share.token !== summary.token)].slice(0, 20));
      setShareAnalytics(null);
      await copyShareUrl(summary.token);
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : "共有リンクの作成に失敗しました");
    } finally {
      setIsSharing(false);
    }
  }

  async function updateShareAd() {
    if (!currentShare) return;
    setIsSharing(true);
    setError(null);

    try {
      const response = await fetch(`/api/shares/${currentShare.token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adConfig: shareAdConfig })
      });
      if (!response.ok) throw new Error(await readErrorMessage(response, "広告設定の更新に失敗しました"));
      const updated = { ...currentShare, adConfig: shareAdConfig, updatedAt: new Date().toISOString() };
      setCurrentShare(updated);
      setPublicShares((current) => current.map((share) => (share.token === updated.token ? updated : share)));
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : "広告設定の更新に失敗しました");
    } finally {
      setIsSharing(false);
    }
  }

  async function loadShareAnalytics(share: PublicShareSummary) {
    setCurrentShare(share);
    setShareAdConfig(share.adConfig);
    setIsLoadingAnalytics(true);
    setError(null);

    try {
      const response = await fetch(`/api/shares/${share.token}/analytics`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readErrorMessage(response, "閲覧分析の取得に失敗しました"));
      const data = (await response.json()) as { analytics: ShareAnalytics };
      setShareAnalytics(data.analytics);
      const updatedShare = { ...share, viewCount: data.analytics.totalViews, viewerCount: data.analytics.uniqueViewers };
      setCurrentShare(updatedShare);
      setPublicShares((current) => current.map((item) => (item.token === updatedShare.token ? updatedShare : item)));
    } catch (analyticsError) {
      setError(analyticsError instanceof Error ? analyticsError.message : "閲覧分析の取得に失敗しました");
    } finally {
      setIsLoadingAnalytics(false);
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
    updateDeckUrl(savedDeck.id, 1);
  }

  function toggleSavedDeckSelection(deckId: string) {
    setSelectedDeckIds((current) =>
      current.includes(deckId) ? current.filter((currentId) => currentId !== deckId) : [...current, deckId]
    );
  }

  function toggleAllVisibleDecks() {
    if (isAllVisibleSelected) {
      setSelectedDeckIds((current) => current.filter((deckId) => !visibleSavedDecks.some((savedDeck) => savedDeck.id === deckId)));
      return;
    }

    setSelectedDeckIds((current) => Array.from(new Set([...current, ...visibleSavedDecks.map((savedDeck) => savedDeck.id)])));
  }

  function selectSlide(index: number) {
    if (!deck) return;
    const nextIndex = Math.min(Math.max(index, 0), deck.slides.length - 1);
    setSelectedIndex(nextIndex);
    updateDeckUrl(deck.id, nextIndex + 1);
  }

  async function refreshPublicShares() {
    setPublicShares(await fetchPublicShares());
  }

  async function importExistingDeck(file: File | null) {
    if (!file) return;
    setError(null);
    setImportProgress(0);
    setImportMessage("");

    if (isPptxFile(file)) {
      setError("PPTXの見た目を完全に保った画像化は、Vercel単体では変換エンジンが必要です。PowerPointでPDFとして保存してからアップロードしてください。PDFはそのままマイフォルダ・公開ビューアー・ログ分析に対応します。");
      return;
    }
    if (!isPdfFile(file)) {
      setError("PDFまたはPPTXを選択してください。現在、公開ビューアー用の高再現取り込みはPDFに対応しています。");
      return;
    }

    setIsImporting(true);
    setImportMessage("PDFを読み込んでいます...");

    try {
      const importedDeck = await importPdfDeck(file, {
        onProgress: (progress, message) => {
          setImportProgress(progress);
          setImportMessage(message);
        }
      });

      const userDeck = { ...importedDeck, userId: currentUser };
      setDeck(userDeck);
      setSelectedIndex(0);
      if (userDeck.settings) setInput(userDeck.settings);
      setSavedDecks((current) => {
        const next = mergeDecks([userDeck, ...current]).slice(0, 30);
        saveLocalDecks(currentUser, next);
        return next;
      });
      updateDeckUrl(userDeck.id, 1);
      setImportProgress(100);
      setImportMessage("マイフォルダに保存しました。");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "資料の取り込みに失敗しました");
    } finally {
      setIsImporting(false);
    }
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
          <div className="upload-panel">
            <label className={isImporting ? "upload-drop disabled" : "upload-drop"}>
              <input
                type="file"
                accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                disabled={isImporting}
                onChange={(event) => {
                  void importExistingDeck(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
              <UploadCloud size={18} />
              <span>{isImporting ? "取り込み中..." : "PDF/PPTXをアップロード"}</span>
            </label>
            {isImporting || importMessage ? (
              <div className="import-progress" aria-live="polite">
                <div>
                  <span style={{ width: `${importProgress}%` }} />
                </div>
                <small>{importMessage || `${importProgress}%`}</small>
              </div>
            ) : (
              <p className="muted-text">PDFは1ページ1画像として保存され、公開ビューアーと分析にそのまま使えます。</p>
            )}
          </div>
          <div className="saved-deck-list">
            {isLoadingDecks ? <p className="muted-text">読み込み中...</p> : null}
            {!isLoadingDecks && savedDecks.length === 0 ? <p className="muted-text">生成するとここに保存されます。</p> : null}
            {visibleSavedDecks.map((savedDeck) => (
              <div key={savedDeck.id} className={deck?.id === savedDeck.id ? "saved-deck-row active" : "saved-deck-row"}>
                <label className="deck-select" title="統合PPTXに含める">
                  <input
                    type="checkbox"
                    checked={selectedDeckIds.includes(savedDeck.id)}
                    onChange={() => toggleSavedDeckSelection(savedDeck.id)}
                    aria-label={`${savedDeck.title}を統合PPTXに含める`}
                  />
                </label>
                <button type="button" className="saved-deck" onClick={() => openSavedDeck(savedDeck)}>
                  <strong>{savedDeck.title}</strong>
                  <span>
                    {savedDeck.mode.toUpperCase()} / {savedDeck.slideCount}枚 / {formatDate(savedDeck.updatedAt)}
                  </span>
                </button>
              </div>
            ))}
          </div>
          <div className="library-actions">
            <button type="button" className="mini-button" onClick={toggleAllVisibleDecks} disabled={visibleSavedDecks.length === 0}>
              {isAllVisibleSelected ? "表示分を解除" : "表示分を選択"}
            </button>
            <button
              type="button"
              className="mini-button primary"
              onClick={exportSelectedDecks}
              disabled={selectedFolderDecks.length === 0 || isExportingBundle}
              title="選択したスライドセットを1つのPPTXに統合してダウンロード"
            >
              {isExportingBundle ? <Loader2 className="spin" size={15} /> : <Download size={15} />}
              統合PPTX
            </button>
          </div>
          <p className="muted-text">
            選択中: {selectedFolderDecks.length}件 / {selectedFolderSlideCount}枚
          </p>
        </section>

        <section className="field-group share-panel" aria-label="管理者機能">
          <SectionTitle icon={<Share2 size={16} />} label="管理者機能" />
          <div className="admin-subhead">
            <strong>現在の資料を公開</strong>
            <span>表示中の資料から、参照専用の共有URLを作成します。広告は作成後にURLごとに設定します。</span>
          </div>
          <div className="library-actions">
            <button type="button" className="mini-button primary" onClick={createShareLink} disabled={!deck || isSharing}>
              {isSharing ? <Loader2 className="spin" size={15} /> : <Share2 size={15} />}
              公開URL作成
            </button>
            <button type="button" className="mini-button" onClick={refreshPublicShares}>
              一覧更新
            </button>
          </div>

          <div className="admin-subhead">
            <strong>公開URL一覧</strong>
            <span>URLごとに広告設定と閲覧分析を管理します。</span>
          </div>
          {publicShares.length > 0 ? (
            <div className="share-list">
              {publicShares.slice(0, 10).map((share) => (
                <button
                  key={share.token}
                  type="button"
                  className={currentShare?.token === share.token ? "share-list-item active" : "share-list-item"}
                  onClick={() => loadShareAnalytics(share)}
                >
                  <strong>{share.title}</strong>
                  <span>
                    {share.slideCount}枚 / {share.viewCount}PV / {share.viewerCount}人
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted-text">公開URLはまだありません。</p>
          )}
          {currentShare ? (
            <div className="share-admin-detail">
              <div className="admin-subhead compact">
                <strong>選択中の公開URL</strong>
                <span>{currentShare.title}</span>
              </div>
              <div className="share-url-box">
                <input readOnly value={shareUrlFor(currentShare.token)} />
                <button type="button" className="mini-button" onClick={() => copyShareUrl(currentShare.token)} title="共有URLをコピー">
                  <Copy size={15} />
                </button>
                <a className="mini-button" href={shareUrlFor(currentShare.token)} target="_blank" rel="noreferrer" title="共有ビューアーを開く">
                  <ExternalLink size={15} />
                </a>
              </div>

              <div className="admin-subhead compact">
                <strong>広告修正</strong>
                <span>この公開URLのビューアー下部に表示する告知を設定します。</span>
              </div>
              <div className="segmented three" role="tablist" aria-label="選択URLの広告タイプ">
                {(["none", "text", "image"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={shareAdConfig.kind === kind ? "active" : ""}
                    onClick={() => setShareAdConfig((current) => ({ ...current, kind }))}
                    aria-pressed={shareAdConfig.kind === kind}
                  >
                    {kind === "none" ? "広告なし" : kind === "text" ? "テキスト" : "画像"}
                  </button>
                ))}
              </div>
              {shareAdConfig.kind !== "none" ? (
                <>
                  <label>
                    告知テキスト
                    <input value={shareAdConfig.text ?? ""} onChange={(event) => setShareAdConfig((current) => ({ ...current, text: event.target.value }))} />
                  </label>
                  {shareAdConfig.kind === "image" ? (
                    <label>
                      広告画像URL
                      <input value={shareAdConfig.imageUrl ?? ""} onChange={(event) => setShareAdConfig((current) => ({ ...current, imageUrl: event.target.value }))} />
                    </label>
                  ) : null}
                  <label>
                    クリック遷移先URL
                    <input value={shareAdConfig.linkUrl ?? ""} onChange={(event) => setShareAdConfig((current) => ({ ...current, linkUrl: event.target.value }))} />
                  </label>
                </>
              ) : null}
              <div className="library-actions">
                <button type="button" className="mini-button primary" onClick={updateShareAd} disabled={isSharing}>
                  {isSharing ? <Loader2 className="spin" size={15} /> : null}
                  広告を保存
                </button>
                <button type="button" className="mini-button" onClick={() => loadShareAnalytics(currentShare)} disabled={isLoadingAnalytics}>
                  {isLoadingAnalytics ? <Loader2 className="spin" size={15} /> : <BarChart3 size={15} />}
                  分析を更新
                </button>
              </div>
              {shareAnalytics ? <ShareAnalyticsPanel analytics={shareAnalytics} /> : null}
            </div>
          ) : null}
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
          <button
            className="icon-button"
            type="button"
            onClick={exportPptx}
            disabled={!deck || isExporting}
            title="表示中の最終成果物をPPTXでダウンロード"
            aria-label="表示中の最終成果物をPPTXでダウンロード"
          >
            {isExporting ? <Loader2 className="spin" size={18} /> : <Download size={18} />}
            PPTX
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
          onSelect={selectSlide}
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

function ShareAnalyticsPanel({ analytics }: { analytics: ShareAnalytics }) {
  return (
    <div className="analytics-panel">
      <div className="analytics-stats">
        <span>
          <strong>{analytics.totalViews}</strong>
          総PV
        </span>
        <span>
          <strong>{analytics.uniqueViewers}</strong>
          閲覧者
        </span>
        <span>
          <strong>{analytics.adClicks}</strong>
          広告クリック
        </span>
      </div>
      <div className="analytics-heading">
        <strong>ページ別の閲覧状況</strong>
        <span>PV / 累計滞在時間 / ユニーク閲覧者</span>
      </div>
      <div className="page-view-list">
        {analytics.pageViews.slice(0, 12).map((page) => (
          <div key={page.pageNo}>
            <span>{String(page.pageNo).padStart(2, "0")}</span>
            <strong>{page.views}PV / {formatSeconds(page.totalSeconds)}</strong>
            <small>{page.uniqueViewers}人</small>
          </div>
        ))}
      </div>
      <div className="analytics-heading">
        <strong>直近イベント</strong>
        <span>誰が、どのページで、どの操作をしたか</span>
      </div>
      <div className="event-log-list">
        {analytics.recentEvents.length > 0 ? (
          analytics.recentEvents.slice(0, 10).map((event, index) => (
            <div key={`${event.createdAt}-${event.viewerId}-${index}`}>
              <span>{formatDateTime(event.createdAt)}</span>
              <strong>{formatEventType(event.eventType)}</strong>
              <small>
                p.{String(event.pageNo).padStart(2, "0")} / {event.viewerLabel || event.viewerId.slice(0, 8)}
              </small>
            </div>
          ))
        ) : (
          <p className="muted-text">まだ閲覧イベントはありません。</p>
        )}
      </div>
    </div>
  );
}

function formatEventType(eventType: ShareAnalytics["recentEvents"][number]["eventType"]) {
  if (eventType === "page_duration") return "滞在";
  if (eventType === "ad_click") return "広告クリック";
  return "閲覧";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatSeconds(totalSeconds: number) {
  if (totalSeconds < 60) return `${totalSeconds}秒`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}分${seconds}秒`;
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

async function fetchPublicShares() {
  try {
    const response = await fetch("/api/shares", { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as { shares?: PublicShareSummary[] };
    return data.shares ?? [];
  } catch {
    return [];
  }
}

async function importPdfDeck(
  file: File,
  callbacks: { onProgress: (progress: number, message: string) => void }
): Promise<Deck> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

  const pdfData = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: pdfData });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  if (pageCount < 1) throw new Error("PDFにページが見つかりませんでした");

  callbacks.onProgress(4, `${pageCount}ページのPDFを解析しています...`);
  const firstPage = await pdf.getPage(1);
  const firstViewport = firstPage.getViewport({ scale: 1 });
  const aspectRatio = nearestAspectRatio(firstViewport.width / firstViewport.height);
  const startResponse = await fetch("/api/decks/import/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: removeFileExtension(file.name),
      sourceFileName: file.name,
      sourceMimeType: file.type || "application/pdf",
      slideCount: pageCount,
      aspectRatio
    })
  });
  if (!startResponse.ok) throw new Error(await readErrorMessage(startResponse, "資料取り込みの開始に失敗しました"));
  const startData = (await startResponse.json()) as { deck: Deck };
  const importedSlides: Slide[] = [];

  for (let pageNo = 1; pageNo <= pageCount; pageNo += 1) {
    callbacks.onProgress(Math.round(((pageNo - 1) / pageCount) * 88) + 6, `${pageNo}/${pageCount}ページを画像化しています...`);
    const page = pageNo === 1 ? firstPage : await pdf.getPage(pageNo);
    const image = await renderPdfPageToImage(page);
    callbacks.onProgress(Math.round(((pageNo - 0.5) / pageCount) * 88) + 6, `${pageNo}/${pageCount}ページを保存しています...`);
    const slide = await uploadImportedSlide(startData.deck.id, pageNo, `Slide ${pageNo}`, image);
    importedSlides.push(slide);
    callbacks.onProgress(Math.round((pageNo / pageCount) * 88) + 6, `${pageNo}/${pageCount}ページを保存しました`);
  }

  callbacks.onProgress(96, "マイフォルダに反映しています...");
  const finishResponse = await fetch("/api/decks/import/finish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deckId: startData.deck.id })
  });
  const finishData = finishResponse.ok ? ((await finishResponse.json()) as { deck: Deck | null }) : { deck: null };
  const now = new Date().toISOString();

  return finishData.deck ?? {
    ...startData.deck,
    status: "completed",
    slideCount: importedSlides.length,
    slides: importedSlides,
    updatedAt: now
  };
}

async function renderPdfPageToImage(page: PDFPageProxy) {
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(2, Math.max(1, 1440 / baseViewport.width));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PDFページの画像化に失敗しました");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: context, viewport }).promise;

  const blob = await canvasToBlob(canvas, "image/jpeg", 0.86);
  canvas.width = 1;
  canvas.height = 1;
  return blob;
}

async function uploadImportedSlide(deckId: string, pageNo: number, title: string, image: Blob) {
  const formData = new FormData();
  formData.append("deckId", deckId);
  formData.append("pageNo", String(pageNo));
  formData.append("title", title);
  formData.append("image", image, `slide-${String(pageNo).padStart(3, "0")}.jpg`);

  const response = await fetchWithRetry("/api/decks/import/slide", {
    method: "POST",
    body: formData
  });
  if (!response.ok) throw new Error(await readErrorMessage(response, `${pageNo}ページ目の保存に失敗しました`));
  const data = (await response.json()) as { slide: Slide };
  return data.slide;
}

async function fetchWithRetry(input: RequestInfo | URL, init: RequestInit, retries = 2) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(input, init, 60000);
      if (response.ok || response.status < 500 || attempt === retries) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
    }
    await wait(900 * (attempt + 1));
  }

  throw lastError instanceof Error ? lastError : new Error("アップロード通信に失敗しました");
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("スライド画像の作成に失敗しました"));
    }, type, quality);
  });
}

function nearestAspectRatio(ratio: number): AspectRatio {
  const candidates: Array<{ value: AspectRatio; ratio: number }> = [
    { value: "16:9", ratio: 16 / 9 },
    { value: "4:3", ratio: 4 / 3 },
    { value: "1:1", ratio: 1 }
  ];
  return candidates.reduce((best, candidate) =>
    Math.abs(candidate.ratio - ratio) < Math.abs(best.ratio - ratio) ? candidate : best
  ).value;
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isPptxFile(file: File) {
  return (
    file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    file.name.toLowerCase().endsWith(".pptx")
  );
}

function removeFileExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

async function fetchBundledDecks(user: string) {
  const bundledPaths = [
    "/generated-decks/kojima-material-poc/deck.json",
    "/generated-decks/ai-webinar-1hour/deck.json",
  ];
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

function readInitialPageIndex(slideCount: number) {
  const searchParams = new URLSearchParams(window.location.search);
  const pageFromQuery = Number(searchParams.get("page"));
  const pageFromHash = Number(window.location.hash.match(/^#page-(\d+)$/)?.[1]);
  const page = Number.isFinite(pageFromQuery) && pageFromQuery > 0 ? pageFromQuery : pageFromHash;

  if (!Number.isFinite(page) || page < 1) return 0;
  return Math.min(page - 1, Math.max(slideCount - 1, 0));
}

function updateDeckUrl(deckId: string, pageNo: number) {
  const url = new URL(window.location.href);
  url.searchParams.set("deck", deckId);
  url.hash = `page-${pageNo}`;
  window.history.replaceState(null, "", url);
}

function shareUrlFor(token: string) {
  if (typeof window === "undefined") return `/share/${token}`;
  return `${window.location.origin}/share/${token}`;
}

async function copyShareUrl(token: string) {
  const url = shareUrlFor(token);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const input = document.createElement("input");
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
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
