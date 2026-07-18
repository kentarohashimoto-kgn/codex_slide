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
        section: sectionForPage(pageNo, slideCount),
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
      cssContent: buildSlideCss(template)
    };
  }

  return {
    ...slide,
    imagePrompt,
    imageUrl: buildSvgDataUrl(slide, template)
  };
}

export function buildImagePrompt(slide: Slide, input: DeckGenerationRequest, template: TemplateDefinition) {
  return [
    `Create a ${input.language === "ja" ? "Japanese" : input.language} 16:9 presentation slide.`,
    `Template: ${template.name}.`,
    `Tone: ${input.tone || template.description}.`,
    `Layout type: ${slide.layoutType}.`,
    `Title: ${slide.title}.`,
    `Message: ${slide.summary}.`,
    `Body points: ${slide.body}.`,
    `Visual rules: ${template.visualRules.join("; ")}.`,
    `Avoid: ${template.negativeRules.join("; ")}.`
  ].join("\n");
}

export function buildSlideHtml(slide: Slide, input: DeckGenerationRequest, template: TemplateDefinition) {
  const points = slide.body
    .split("\n")
    .filter(Boolean)
    .map((point) => `<li>${escapeHtml(point.replace(/^[-・\d.\s]+/, ""))}</li>`)
    .join("");

  return `
<section class="ai-slide ai-slide-${slide.layoutType}" aria-label="${escapeHtml(slide.title)}">
  <div class="slide-kicker">${escapeHtml(slide.section)} / ${String(slide.pageNo).padStart(2, "0")}</div>
  <h1>${escapeHtml(slide.title)}</h1>
  <p class="slide-summary">${escapeHtml(slide.summary)}</p>
  <div class="slide-grid">
    <ul>${points}</ul>
    <div class="diagram" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>
  </div>
  <p class="slide-foot">${escapeHtml(input.purpose || "AI generated deck")}</p>
</section>`.trim();
}

export function buildSlideCss(template: TemplateDefinition) {
  const p = template.palette;
  return `
:root {
  --paper: ${p.paper};
  --paper-raised: ${p.paperRaised};
  --ink: ${p.ink};
  --ink-soft: ${p.inkSoft};
  --accent: ${p.accent};
  --accent2: ${p.accent2};
  --panel: ${p.panel};
}
* { box-sizing: border-box; }
body { margin: 0; font-family: ${template.typography.body}; color: var(--ink); background: var(--paper); }
.ai-slide {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  padding: ${template.htmlTokens.stagePadding};
  background:
    linear-gradient(115deg, rgba(255,255,255,.62), rgba(255,255,255,0) 56%),
    radial-gradient(circle at 82% 18%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 28%),
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
  font: 800 ${template.htmlTokens.titleSize}/1.08 ${template.typography.heading};
  letter-spacing: 0;
}
.slide-summary {
  position: relative;
  z-index: 1;
  max-width: 780px;
  margin: 0;
  color: var(--ink-soft);
  font-size: ${template.htmlTokens.bodySize};
  line-height: 1.55;
}
.slide-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, .9fr) minmax(320px, .7fr);
  gap: 42px;
  align-items: end;
  margin-top: 48px;
}
ul {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
li {
  min-height: 48px;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255,255,255,.56);
  border: 1px solid rgba(32,38,40,.13);
  border-radius: ${template.htmlTokens.radius};
  font-size: 21px;
  line-height: 1.45;
}
.diagram {
  min-height: 250px;
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
.slide-foot {
  position: absolute;
  right: 56px;
  bottom: 36px;
  z-index: 1;
  margin: 0;
  color: var(--ink-soft);
  font-size: ${template.htmlTokens.captionSize};
}
`.trim();
}

export function buildSvgDataUrl(slide: Slide, template: TemplateDefinition) {
  const p = template.palette;
  const bodyLines = slide.body
    .split("\n")
    .filter(Boolean)
    .slice(0, 4)
    .map((line) => line.replace(/^[-・\d.\s]+/, ""));
  const items = bodyLines
    .map((line, index) => {
      const y = 426 + index * 68;
      return `<rect x="88" y="${y - 34}" width="610" height="48" rx="10" fill="${p.paperRaised}" opacity=".82"/><text x="116" y="${y}" font-size="24" fill="${p.ink}">${escapeSvg(line)}</text>`;
    })
    .join("");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1672" height="941" viewBox="0 0 1672 941">
  <defs>
    <linearGradient id="paper" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${p.paperRaised}"/>
      <stop offset="1" stop-color="${p.paper}"/>
    </linearGradient>
    <linearGradient id="route" x1="0" x2="1">
      <stop offset="0" stop-color="${p.accent}"/>
      <stop offset="1" stop-color="${p.accent2}"/>
    </linearGradient>
  </defs>
  <rect width="1672" height="941" fill="url(#paper)"/>
  <path d="M1080 0h592v941h-360L987 530c-44-55-45-130-2-186L1250 0z" fill="${p.panel}" opacity=".92"/>
  <path d="M110 702 C 360 538, 552 654, 776 494 S 1160 254, 1458 236" fill="none" stroke="url(#route)" stroke-width="22" stroke-linecap="round" opacity=".42"/>
  <text x="88" y="108" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${p.accent}">${escapeSvg(slide.section)} / ${String(slide.pageNo).padStart(2, "0")}</text>
  <foreignObject x="88" y="150" width="920" height="200">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font:800 64px/1.08 Arial, sans-serif;color:${p.ink};letter-spacing:0;">${escapeHtml(slide.title)}</div>
  </foreignObject>
  <foreignObject x="88" y="318" width="800" height="86">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font:400 27px/1.55 Arial, sans-serif;color:${p.inkSoft};">${escapeHtml(slide.summary)}</div>
  </foreignObject>
  ${items}
  <circle cx="1246" cy="436" r="104" fill="${p.paperRaised}" opacity=".9"/>
  <circle cx="1246" cy="436" r="72" fill="none" stroke="${p.accent}" stroke-width="8"/>
  <path d="M1210 436h72M1246 400v72" stroke="${p.panel}" stroke-width="7" stroke-linecap="round"/>
  <text x="1502" y="884" font-family="Arial, sans-serif" font-size="20" fill="${p.paperRaised}" opacity=".75">${String(slide.pageNo).padStart(2, "0")} / deck</text>
</svg>`.trim();

  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

export function clampSlideCount(value: number) {
  if (!Number.isFinite(value)) return 18;
  return Math.max(3, Math.min(30, Math.round(value)));
}

function createSlideTitle(input: DeckGenerationRequest, pageNo: number, slideCount: number, layoutType: LayoutType) {
  if (pageNo === 1) return input.title || "AIで資料づくりを前に進める";
  if (pageNo === slideCount) return "次に進める小さな一歩";

  const labels: Record<LayoutType, string> = {
    cover: input.title || "全体像",
    agenda: "この資料でわかること",
    comparison: "従来の作り方との違い",
    process: "完成までの流れ",
    benefit: "導入で得られるメリット",
    use_case: "具体的な活用シーン",
    safety: "運用時に決めておくこと",
    glossary: "押さえておきたい用語",
    closing: "次に進める小さな一歩"
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
  return "まず小さな成果物を一つ作り、使いながら改善します。";
}

function createSlideBody(input: DeckGenerationRequest, pageNo: number, layoutType: LayoutType) {
  const materialHint = input.material ? "入力資料の要点を参照" : "追加資料があれば反映";
  const tone = input.tone || "実務的でわかりやすい";
  const map: Record<LayoutType, string[]> = {
    cover: ["目的を短く示す", "対象読者を明確にする", "全体の期待値をそろえる"],
    agenda: ["背景と課題", "解決方針", "実行ステップ", "注意点と次アクション"],
    comparison: ["従来: 分断された作業", "新方式: 生成と確認を接続", "人は判断に集中", "AIは制作を支援"],
    process: ["目的を確認", "材料を読む", "スライドを生成", "プレビューで確認", "PPTXを書き出す"],
    benefit: ["作成時間を短縮", "トンマナを統一", "ページ単位で再生成", materialHint],
    use_case: ["営業提案", "研修資料", "社内説明", "ウェビナー構成"],
    safety: ["機密情報を選別", "出典を残す", "外部公開は承認", "未確認事項を分ける"],
    glossary: ["テンプレート: 見た目と構造の型", "トンマナ: 文章と視覚の調子", "PPTX: PowerPoint形式", "プレビュー: 生成結果の確認"],
    closing: ["小さく試す", "テンプレートを育てる", "成功パターンを再利用する"]
  };

  return map[layoutType].map((item) => `- ${item}`).concat(`- 表現方針: ${tone}`).join("\n");
}

function sectionForPage(pageNo: number, slideCount: number) {
  if (pageNo === 1) return "INTRODUCTION";
  if (pageNo <= 3) return "OVERVIEW";
  if (pageNo >= slideCount - 1) return "CONCLUSION";
  if (pageNo <= Math.ceil(slideCount * 0.45)) return "SECTION 1 / VALUE";
  if (pageNo <= Math.ceil(slideCount * 0.75)) return "SECTION 2 / USE CASES";
  return "SECTION 3 / OPERATION";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function escapeSvg(value: string) {
  return escapeHtml(value).replace(/\n/g, " ");
}

