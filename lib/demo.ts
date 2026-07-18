import { getTemplate } from "@/lib/templates";
import type { Deck, DeckGenerationRequest, LayoutType, Slide, TemplateDefinition } from "@/lib/types";

const layoutCycle: LayoutType[] = [
  "cover",
  "agenda",
  "comparison",
  "process",
  "benefit",
  "benefit",
  "benefit",
  "use_case",
  "use_case",
  "process",
  "safety",
  "glossary",
  "closing"
];

const typographyLabels: Record<DeckGenerationRequest["typographyPreset"], string> = {
  gothic: "modern Japanese gothic sans serif",
  mincho: "Japanese Mincho editorial serif",
  mono: "technical mono label style"
};

const visibilityLabels: Record<DeckGenerationRequest["textVisibility"], string> = {
  standard: "standard density with generous line height",
  high: "high contrast, larger text, fewer words",
  compact: "compact executive density while keeping text readable"
};

export function createDemoDeck(input: DeckGenerationRequest): Deck {
  const template = getTemplate(input.templateId);
  const slideCount = clampSlideCount(input.slideCount);
  const slides = Array.from({ length: slideCount }, (_, index) => {
    const pageNo = index + 1;
    const layoutType = layoutCycle[index % layoutCycle.length];
    const title = createSlideTitle(input, pageNo, slideCount, layoutType);
    const summary = createSlideSummary(input, pageNo, layoutType);
    const body = createSlideBody(input, pageNo, layoutType);

    return enrichSlideForMode(
      {
        id: crypto.randomUUID(),
        pageNo,
        section: sectionForPage(pageNo, slideCount, input),
        title,
        summary,
        body,
        speakerNotes: `${input.audience || "対象読者"}に向けて、${title}を1枚1メッセージで説明します。`,
        layoutType,
        status: "completed"
      },
      input,
      template
    );
  });

  return {
    id: crypto.randomUUID(),
    title: input.title || "AI Slide Deck",
    purpose: input.purpose,
    audience: input.audience,
    language: input.language || "ja",
    mode: input.mode,
    templateId: input.templateId,
    settings: input,
    status: "completed",
    slideCount,
    slides,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function enrichSlideForMode(slide: Slide, input: DeckGenerationRequest, template: TemplateDefinition): Slide {
  const imagePrompt = buildImagePrompt(slide, input, template);
  if (input.mode === "html") {
    return {
      ...slide,
      imagePrompt,
      htmlContent: buildSlideHtml(slide, input, template),
      cssContent: buildSlideCss(template, input)
    };
  }

  return {
    ...slide,
    imagePrompt,
    imageUrl: buildSvgDataUrl(slide, template, input)
  };
}

export function buildImagePrompt(slide: Slide, input: DeckGenerationRequest, template: TemplateDefinition) {
  return [
    `Create a ${input.language === "ja" ? "Japanese" : input.language} presentation slide.`,
    `Aspect ratio: ${input.aspectRatio}.`,
    `Template source: ${template.source}. Template: ${template.name}.`,
    `Mood keywords: ${template.moodKeywords.join(", ")}.`,
    `Tone: ${input.tone || template.description}.`,
    `Deck type: ${input.deckType}${input.deckType === "chapter" ? `, chapter ${input.chapterIndex} of ${input.chapterTotal}` : ""}.`,
    `Slide count in this batch: ${input.slideCount}.`,
    `Typography: ${typographyLabels[input.typographyPreset]}.`,
    `Text visibility: ${visibilityLabels[input.textVisibility]}.`,
    input.brandColor ? `Brand color override: ${input.brandColor}.` : "",
    input.showPageNumber
      ? `Add subtle page number ${displayPageNumber(slide, input)} in the footer area.`
      : "Do not add page numbers.",
    input.showFooterTitle ? `Repeat deck title in a subtle footer: ${input.title}.` : "Do not repeat the deck title in the footer.",
    `Cover message position: ${input.coverMessagePosition}. Closing layout: ${input.outroLayout}.`,
    creditLine(input) ? `Credit information: ${creditLine(input)}.` : "",
    input.creditCta ? `Final slide CTA: ${input.creditCta}.` : "",
    input.extraNote ? `Additional instruction: ${input.extraNote}.` : "",
    `Layout type: ${slide.layoutType}.`,
    `Title: ${slide.title}.`,
    `Message: ${slide.summary}.`,
    `Body points: ${slide.body}.`,
    `Visual rules: ${template.visualRules.join("; ")}.`,
    `Avoid: ${template.negativeRules.join("; ")}.`
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildSlideHtml(slide: Slide, input: DeckGenerationRequest, template: TemplateDefinition) {
  const points = slide.body
    .split("\n")
    .filter(Boolean)
    .map((point) => `<li>${escapeHtml(point.replace(/^[-・\d.\s]+/, ""))}</li>`)
    .join("");
  const credits = creditLine(input);
  const footerItems = [
    input.showFooterTitle ? escapeHtml(input.title) : "",
    input.showPageNumber ? escapeHtml(displayPageNumber(slide, input)) : ""
  ].filter(Boolean);
  const isClosing = slide.layoutType === "closing";

  return `
<section class="ai-slide ai-slide-${slide.layoutType}" aria-label="${escapeHtml(slide.title)}">
  <div class="slide-kicker">${escapeHtml(slide.section)} / ${String(slide.pageNo).padStart(2, "0")}</div>
  <h1>${escapeHtml(slide.title)}</h1>
  <p class="slide-summary">${escapeHtml(slide.summary)}</p>
  ${slide.pageNo === 1 && credits ? `<p class="slide-credit">${escapeHtml(credits)}</p>` : ""}
  <div class="slide-grid">
    <ul>${points}</ul>
    <div class="diagram" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>
  </div>
  ${isClosing && input.creditCta ? `<p class="slide-cta">${escapeHtml(input.creditCta)}</p>` : ""}
  ${input.creditContact && isClosing ? `<p class="slide-contact">${escapeHtml(input.creditContact)}</p>` : ""}
  ${footerItems.length > 0 ? `<p class="slide-foot">${footerItems.join(" / ")}</p>` : ""}
</section>`.trim();
}

export function buildSlideCss(template: TemplateDefinition, input: DeckGenerationRequest) {
  const p = template.palette;
  const accent = normalizeColor(input.brandColor) ?? p.accent;
  const headingFont = typographyFor(input, template, "heading");
  const bodyFont = typographyFor(input, template, "body");
  const titleSize = input.textVisibility === "high" ? "58px" : input.textVisibility === "compact" ? "44px" : template.htmlTokens.titleSize;
  const bodySize = input.textVisibility === "high" ? "25px" : input.textVisibility === "compact" ? "19px" : template.htmlTokens.bodySize;
  const gridTemplate = input.outroLayout === "stacked" ? "1fr" : "minmax(0, .9fr) minmax(300px, .7fr)";
  const coverAlign = input.coverMessagePosition === "right" ? "margin-left: auto; text-align: right;" : "";

  return `
:root {
  --paper: ${p.paper};
  --paper-raised: ${p.paperRaised};
  --ink: ${p.ink};
  --ink-soft: ${p.inkSoft};
  --accent: ${accent};
  --accent2: ${p.accent2};
  --panel: ${p.panel};
}
* { box-sizing: border-box; }
body { margin: 0; font-family: ${bodyFont}; color: var(--ink); background: var(--paper); }
.ai-slide {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  padding: ${template.htmlTokens.stagePadding};
  background:
    linear-gradient(115deg, rgba(255,255,255,.62), rgba(255,255,255,0) 56%),
    radial-gradient(circle at 82% 18%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 28%),
    var(--paper);
}
.ai-slide::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(0deg, transparent 0 6px, rgba(32,38,40,.035) 6px 7px),
    linear-gradient(130deg, transparent 0 58%, var(--panel) 58.2% 100%);
  opacity: .18;
}
.slide-kicker {
  position: relative;
  z-index: 1;
  color: color-mix(in srgb, var(--accent) 78%, var(--ink));
  font: 700 14px/1.2 ${template.typography.mono};
  letter-spacing: .08em;
  text-transform: uppercase;
}
h1 {
  position: relative;
  z-index: 1;
  max-width: 850px;
  margin: 24px 0 18px;
  font: 800 ${titleSize}/1.08 ${headingFont};
  letter-spacing: 0;
}
.ai-slide-cover h1,
.ai-slide-cover .slide-summary {
  ${coverAlign}
}
.slide-summary {
  position: relative;
  z-index: 1;
  max-width: 780px;
  margin: 0;
  color: var(--ink-soft);
  font-size: ${bodySize};
  line-height: ${input.textVisibility === "compact" ? "1.42" : "1.55"};
}
.slide-credit {
  position: relative;
  z-index: 1;
  max-width: 780px;
  margin: 16px 0 0;
  color: var(--ink-soft);
  font-size: ${template.htmlTokens.captionSize};
}
.slide-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: ${slideGridTemplate(gridTemplate, input)};
  gap: 42px;
  align-items: end;
  margin-top: ${input.textVisibility === "compact" ? "34px" : "48px"};
}
ul {
  display: grid;
  gap: ${input.textVisibility === "compact" ? "10px" : "14px"};
  margin: 0;
  padding: 0;
  list-style: none;
}
li {
  min-height: ${input.textVisibility === "compact" ? "42px" : "48px"};
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255,255,255,.56);
  border: 1px solid rgba(32,38,40,.13);
  border-radius: ${template.htmlTokens.radius};
  font-size: ${input.textVisibility === "high" ? "23px" : input.textVisibility === "compact" ? "18px" : "21px"};
  line-height: 1.45;
}
.diagram {
  min-height: ${input.textVisibility === "compact" ? "220px" : "250px"};
  position: relative;
  border-radius: ${template.htmlTokens.radius};
  border: 1px solid rgba(32,38,40,.14);
  background: linear-gradient(145deg, rgba(255,255,255,.72), rgba(255,255,255,.22));
}
.diagram::before {
  content: "";
  position: absolute;
  inset: 46% 10% auto 10%;
  height: 10px;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
  box-shadow: 0 0 22px color-mix(in srgb, var(--accent) 36%, transparent);
}
.diagram span {
  position: absolute;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 2px solid var(--accent);
  background: var(--paper-raised);
}
.diagram span:nth-child(1) { left: 12%; top: 28%; }
.diagram span:nth-child(2) { left: 42%; top: 48%; }
.diagram span:nth-child(3) { right: 12%; top: 28%; }
.slide-foot,
.slide-contact {
  position: absolute;
  right: 56px;
  bottom: 36px;
  z-index: 1;
  margin: 0;
  color: var(--ink-soft);
  font-size: ${template.htmlTokens.captionSize};
}
.slide-contact {
  left: 56px;
  right: auto;
}
.slide-cta {
  position: relative;
  z-index: 1;
  display: inline-flex;
  margin: 26px 0 0;
  padding: 12px 16px;
  border-radius: ${template.htmlTokens.radius};
  color: var(--paper-raised);
  background: var(--panel);
  font-weight: 800;
}
@media (max-width: 760px) {
  .ai-slide { padding: 34px; }
  h1 { font-size: 36px; }
  .slide-summary { font-size: 19px; }
  .slide-grid { grid-template-columns: 1fr; gap: 20px; margin-top: 28px; }
  .diagram { min-height: 160px; }
}
`.trim();
}

export function buildSvgDataUrl(slide: Slide, template: TemplateDefinition, input?: DeckGenerationRequest) {
  const p = template.palette;
  const ratio = input?.aspectRatio ?? "16:9";
  const size = svgSizeForRatio(ratio);
  const accent = normalizeColor(input?.brandColor ?? "") ?? p.accent;
  const bodyLines = slide.body
    .split("\n")
    .filter(Boolean)
    .slice(0, input?.textVisibility === "compact" ? 5 : 4)
    .map((line) => line.replace(/^[-・\d.\s]+/, ""));
  const titleWidth = Math.round(size.width * 0.58);
  const summaryWidth = Math.round(size.width * 0.52);
  const panelStart = Math.round(size.width * 0.64);
  const lineY = Math.round(size.height * 0.75);
  const items = bodyLines
    .map((line, index) => {
      const y = Math.round(size.height * 0.45) + index * 64;
      return `<rect x="88" y="${y - 34}" width="${Math.round(size.width * 0.36)}" height="48" rx="10" fill="${p.paperRaised}" opacity=".82"/><text x="116" y="${y}" font-size="24" fill="${p.ink}">${escapeSvg(line)}</text>`;
    })
    .join("");
  const footer = input?.showPageNumber
    ? `<text x="${size.width - 170}" y="${size.height - 56}" font-family="Arial, sans-serif" font-size="20" fill="${p.paperRaised}" opacity=".78">${escapeSvg(displayPageNumber(slide, input))}</text>`
    : "";
  const deckTitle = input?.showFooterTitle
    ? `<text x="88" y="${size.height - 56}" font-family="Arial, sans-serif" font-size="20" fill="${p.inkSoft}" opacity=".82">${escapeSvg(input.title)}</text>`
    : "";

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">
  <defs>
    <linearGradient id="paper" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${p.paperRaised}"/>
      <stop offset="1" stop-color="${p.paper}"/>
    </linearGradient>
    <linearGradient id="route" x1="0" x2="1">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="1" stop-color="${p.accent2}"/>
    </linearGradient>
  </defs>
  <rect width="${size.width}" height="${size.height}" fill="url(#paper)"/>
  <path d="M${panelStart} 0h${size.width - panelStart}v${size.height}h-${Math.round(size.width * 0.22)}L${panelStart - 120} ${Math.round(size.height * 0.56)}c-44-55-45-130-2-186L${panelStart + 170} 0z" fill="${p.panel}" opacity=".92"/>
  <path d="M110 ${lineY} C 360 ${lineY - 164}, 552 ${lineY - 48}, 776 ${lineY - 208} S ${Math.round(size.width * 0.7)} ${Math.round(size.height * 0.28)}, ${Math.round(size.width * 0.88)} ${Math.round(size.height * 0.25)}" fill="none" stroke="url(#route)" stroke-width="22" stroke-linecap="round" opacity=".42"/>
  <text x="88" y="108" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${accent}">${escapeSvg(slide.section)} / ${String(slide.pageNo).padStart(2, "0")}</text>
  <foreignObject x="88" y="150" width="${titleWidth}" height="210">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font:800 ${ratio === "1:1" ? "58px" : "64px"}/1.08 Arial, sans-serif;color:${p.ink};letter-spacing:0;">${escapeHtml(slide.title)}</div>
  </foreignObject>
  <foreignObject x="88" y="318" width="${summaryWidth}" height="100">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font:400 27px/1.55 Arial, sans-serif;color:${p.inkSoft};">${escapeHtml(slide.summary)}</div>
  </foreignObject>
  ${items}
  <circle cx="${Math.round(size.width * 0.745)}" cy="${Math.round(size.height * 0.46)}" r="104" fill="${p.paperRaised}" opacity=".9"/>
  <circle cx="${Math.round(size.width * 0.745)}" cy="${Math.round(size.height * 0.46)}" r="72" fill="none" stroke="${accent}" stroke-width="8"/>
  <path d="M${Math.round(size.width * 0.745) - 36} ${Math.round(size.height * 0.46)}h72M${Math.round(size.width * 0.745)} ${Math.round(size.height * 0.46) - 36}v72" stroke="${p.panel}" stroke-width="7" stroke-linecap="round"/>
  ${deckTitle}
  ${footer}
</svg>`.trim();

  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

export function clampSlideCount(value: number) {
  if (!Number.isFinite(value)) return 18;
  return Math.max(1, Math.min(30, Math.round(value)));
}

function createSlideTitle(input: DeckGenerationRequest, pageNo: number, slideCount: number, layoutType: LayoutType) {
  if (pageNo === 1) return input.title || "AIで資料づくりを前に進める";
  if (pageNo === slideCount) return input.creditCta || "次に進める小さな一歩";

  const labels: Record<LayoutType, string> = {
    cover: input.title || "全体像",
    agenda: "この資料でわかること",
    comparison: "従来の作り方との違い",
    process: input.deckType === "chapter" ? `第${input.chapterIndex}章の流れ` : "完成までの流れ",
    benefit: "導入で得られるメリット",
    use_case: "具体的な活用シーン",
    safety: "運用時に決めておくこと",
    glossary: "押さえておきたい用語",
    closing: input.creditCta || "次に進める小さな一歩"
  };
  return labels[layoutType];
}

function createSlideSummary(input: DeckGenerationRequest, pageNo: number, layoutType: LayoutType) {
  const target = input.audience || "読み手";
  const purpose = input.purpose || "伝えたい内容";
  if (pageNo === 1) return `${target}に向けて、${purpose}をわかりやすく整理します。`;
  if (layoutType === "agenda") return "背景、価値、進め方、注意点、次のアクションの順に読みます。";
  if (layoutType === "comparison") return "今まで人が分断して行っていた作業を、生成と検品の流れでつなぎます。";
  if (layoutType === "process") return "目的確認、材料整理、制作、確認、納品を一続きの流れにします。";
  if (layoutType === "benefit") return "作業時間の短縮だけでなく、品質のばらつきを減らすことを狙います。";
  if (layoutType === "use_case") return "日常業務の中で、すぐに試せる場面から導入します。";
  if (layoutType === "safety") return "公開、送信、削除、機密情報の扱いには人の承認を挟みます。";
  if (layoutType === "glossary") return "初めての人がつまずきやすい言葉を先にそろえます。";
  return input.creditCta || "まず小さな成果物を一つ作り、使いながら改善します。";
}

function createSlideBody(input: DeckGenerationRequest, pageNo: number, layoutType: LayoutType) {
  const materialHint = input.material ? "入力資料の要点を参照" : "追加資料があれば反映";
  const tone = input.tone || "実務的でわかりやすい";
  const pageHint = input.showPageNumber ? `ページ表記: ${displayPageNumber({ pageNo } as Slide, input)}` : "ページ番号なし";
  const map: Record<LayoutType, string[]> = {
    cover: ["目的を短く示す", "対象読者を明確にする", "全体の期待値をそろえる"],
    agenda: ["背景と課題", "解決方針", "実行ステップ", "注意点と次アクション"],
    comparison: ["従来: 分断された作業", "新方式: 生成と確認を接続", "人は判断に集中", "AIは制作を支援"],
    process: ["目的を確認", "材料を読む", "スライドを生成", "プレビューで確認", "PPTXを書き出す"],
    benefit: ["作成時間を短縮", "トンマナを統一", "ページ単位で再生成", materialHint],
    use_case: ["営業提案", "研修資料", "社内説明", "ウェビナー構成"],
    safety: ["機密情報を選別", "出典を残す", "外部公開は承認", "未確認事項を分ける"],
    glossary: ["テンプレート: 見た目と構造の型", "トンマナ: 文章と視覚の調子", "PPTX: PowerPoint形式", "プレビュー: 生成結果の確認"],
    closing: [input.creditCta || "小さく試す", input.creditContact || "問い合わせ先を明示", "成功パターンを再利用する"]
  };

  return map[layoutType].map((item) => `- ${item}`).concat(`- 表現方針: ${tone}`, `- ${pageHint}`).join("\n");
}

function sectionForPage(pageNo: number, slideCount: number, input: DeckGenerationRequest) {
  const prefix = input.deckType === "chapter" ? `CHAPTER ${input.chapterIndex}` : "";
  if (pageNo === 1) return [prefix, "INTRODUCTION"].filter(Boolean).join(" / ");
  if (pageNo <= 3) return [prefix, "OVERVIEW"].filter(Boolean).join(" / ");
  if (pageNo >= slideCount - 1) return [prefix, "CONCLUSION"].filter(Boolean).join(" / ");
  if (pageNo <= Math.ceil(slideCount * 0.45)) return [prefix, "SECTION 1 / VALUE"].filter(Boolean).join(" / ");
  if (pageNo <= Math.ceil(slideCount * 0.75)) return [prefix, "SECTION 2 / USE CASES"].filter(Boolean).join(" / ");
  return [prefix, "SECTION 3 / OPERATION"].filter(Boolean).join(" / ");
}

function displayPageNumber(slide: Pick<Slide, "pageNo">, input: DeckGenerationRequest) {
  const current = Math.max(1, input.pageNumberOffset || 1) + slide.pageNo - 1;
  const total = input.splitPagination ? Math.max(current, input.totalPages || input.slideCount) : input.slideCount;
  return `${current} / ${total}`;
}

function creditLine(input: DeckGenerationRequest) {
  return [input.creditAuthor, input.creditOrganization, input.creditDate].filter(Boolean).join(" / ");
}

function typographyFor(input: DeckGenerationRequest, template: TemplateDefinition, role: "heading" | "body") {
  if (input.typographyPreset === "mincho" && role === "heading") return "Hiragino Mincho ProN, Yu Mincho, serif";
  if (input.typographyPreset === "mono") return "JetBrains Mono, ui-monospace, monospace";
  return role === "heading" ? template.typography.heading : template.typography.body;
}

function slideGridTemplate(gridTemplate: string, input: DeckGenerationRequest) {
  if (input.aspectRatio === "1:1") return "1fr";
  return gridTemplate;
}

function svgSizeForRatio(ratio: DeckGenerationRequest["aspectRatio"]) {
  if (ratio === "4:3") return { width: 1333, height: 1000 };
  if (ratio === "1:1") return { width: 1200, height: 1200 };
  return { width: 1672, height: 941 };
}

function normalizeColor(value: string) {
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function escapeSvg(value: string) {
  return escapeHtml(value).replace(/\n/g, " ");
}
