import type { TemplateDefinition, TemplateSource } from "@/lib/types";

export const templates: TemplateDefinition[] = [
  {
    id: "soft-paper-guide",
    source: "system",
    name: "やさしい紙質ガイド",
    description: "生成り紙、手描き図解、ミントの導線で初心者向けに説明するトンマナ。",
    moodKeywords: ["やさしい", "図解", "研修"],
    modeSupport: ["image", "html"],
    palette: {
      paper: "#f3efe6",
      paperRaised: "#fbf8f1",
      ink: "#202628",
      inkSoft: "#586265",
      accent: "#62d8c0",
      accent2: "#8ee8ee",
      panel: "#2a3133"
    },
    previewStyle: {
      background: "linear-gradient(135deg, #fbf8f1 0%, #f3efe6 64%, #d9efe8 100%)",
      line: "#62d8c0",
      block: "#2a3133"
    },
    typography: {
      heading: "Inter Tight, Hiragino Sans, Yu Gothic, sans-serif",
      body: "Inter Tight, Hiragino Sans, Yu Gothic, sans-serif",
      mono: "JetBrains Mono, ui-monospace, monospace"
    },
    visualRules: [
      "16:9 presentation slide",
      "warm paper texture background",
      "charcoal ink typography",
      "mint colored route line as a visual guide",
      "subtle hand-drawn business illustration",
      "one main message per slide"
    ],
    htmlTokens: {
      radius: "10px",
      stagePadding: "64px",
      titleSize: "54px",
      bodySize: "24px",
      captionSize: "16px"
    },
    layoutTypes: ["cover", "agenda", "comparison", "process", "benefit", "use_case", "safety", "glossary", "closing"],
    negativeRules: [
      "Do not use glossy corporate stock photo styling",
      "Do not overfill the slide with text",
      "Do not use dark blue gradient orb backgrounds",
      "Do not place tiny unreadable labels"
    ]
  },
  {
    id: "sharp-b2b-console",
    source: "system",
    name: "B2B戦略コンソール",
    description: "営業提案・経営報告に向いた、密度高めで落ち着いた業務UI風テンプレート。",
    moodKeywords: ["提案", "経営", "UI"],
    modeSupport: ["image", "html"],
    palette: {
      paper: "#f7f7f2",
      paperRaised: "#ffffff",
      ink: "#1f2526",
      inkSoft: "#667071",
      accent: "#2fb3a0",
      accent2: "#d6b85c",
      panel: "#303739"
    },
    previewStyle: {
      background: "linear-gradient(135deg, #ffffff 0%, #f7f7f2 58%, #d6b85c 100%)",
      line: "#2fb3a0",
      block: "#303739"
    },
    typography: {
      heading: "Inter Tight, Hiragino Sans, Yu Gothic, sans-serif",
      body: "Inter Tight, Hiragino Sans, Yu Gothic, sans-serif",
      mono: "JetBrains Mono, ui-monospace, monospace"
    },
    visualRules: [
      "16:9 executive proposal slide",
      "clean operational dashboard feel",
      "clear grids and compact labels",
      "restrained accent colors",
      "business diagram instead of decorative illustration"
    ],
    htmlTokens: {
      radius: "8px",
      stagePadding: "56px",
      titleSize: "48px",
      bodySize: "22px",
      captionSize: "15px"
    },
    layoutTypes: ["cover", "agenda", "comparison", "process", "benefit", "use_case", "safety", "glossary", "closing"],
    negativeRules: [
      "Do not use oversized marketing hero composition",
      "Do not use playful cartoon styling",
      "Do not use single-color monotone palette"
    ]
  },
  {
    id: "editorial-mincho",
    source: "system",
    name: "エディトリアル明朝",
    description: "余白を広く取り、明朝見出しと写真誌面風の構成で思想やストーリーを伝える。",
    moodKeywords: ["余白", "思想", "上質"],
    modeSupport: ["image", "html"],
    palette: {
      paper: "#f5f1ea",
      paperRaised: "#fffdf8",
      ink: "#26211d",
      inkSoft: "#6d6258",
      accent: "#b74f3d",
      accent2: "#3c6f78",
      panel: "#e2d5c6"
    },
    previewStyle: {
      background: "linear-gradient(135deg, #fffdf8 0%, #f5f1ea 52%, #e2d5c6 100%)",
      line: "#b74f3d",
      block: "#3c6f78"
    },
    typography: {
      heading: "Hiragino Mincho ProN, Yu Mincho, serif",
      body: "Hiragino Sans, Yu Gothic, sans-serif",
      mono: "JetBrains Mono, ui-monospace, monospace"
    },
    visualRules: [
      "editorial magazine style",
      "wide margins and strong typographic hierarchy",
      "one symbolic visual motif per slide",
      "use warm neutral paper with red and teal accents"
    ],
    htmlTokens: {
      radius: "4px",
      stagePadding: "72px",
      titleSize: "56px",
      bodySize: "23px",
      captionSize: "15px"
    },
    layoutTypes: ["cover", "agenda", "benefit", "comparison", "process", "use_case", "closing"],
    negativeRules: [
      "Do not use dashboard widgets",
      "Do not create crowded bullet lists",
      "Do not use neon colors"
    ]
  },
  {
    id: "product-blueprint",
    source: "system",
    name: "プロダクト設計図",
    description: "機能紹介、SaaS企画、システム構成に合う、線画と仕様書風ラベルのテンプレート。",
    moodKeywords: ["SaaS", "仕様", "構成"],
    modeSupport: ["image", "html"],
    palette: {
      paper: "#edf4f5",
      paperRaised: "#ffffff",
      ink: "#16282e",
      inkSoft: "#587078",
      accent: "#1f9bd1",
      accent2: "#f0b84a",
      panel: "#24424c"
    },
    previewStyle: {
      background: "linear-gradient(135deg, #ffffff 0%, #edf4f5 52%, #cfe3e7 100%)",
      line: "#1f9bd1",
      block: "#24424c"
    },
    typography: {
      heading: "Inter Tight, Hiragino Sans, Yu Gothic, sans-serif",
      body: "Inter, Hiragino Sans, Yu Gothic, sans-serif",
      mono: "JetBrains Mono, ui-monospace, monospace"
    },
    visualRules: [
      "product blueprint visual language",
      "thin technical lines and labeled modules",
      "clear component relationships",
      "use charts, flows, and system blocks"
    ],
    htmlTokens: {
      radius: "6px",
      stagePadding: "58px",
      titleSize: "50px",
      bodySize: "22px",
      captionSize: "14px"
    },
    layoutTypes: ["cover", "agenda", "process", "comparison", "use_case", "safety", "closing"],
    negativeRules: [
      "Do not use playful hand drawn sketches",
      "Do not use luxury magazine styling",
      "Do not hide relationships between modules"
    ]
  },
  {
    id: "company-catorce-minimal",
    source: "company",
    name: "自社: CATORCEミニマル",
    description: "白地、チャコール、ミントアクセントで、AI提案を端正に見せる自社標準パターン。",
    moodKeywords: ["自社標準", "AI提案", "端正"],
    modeSupport: ["image", "html"],
    palette: {
      paper: "#f8f7f3",
      paperRaised: "#ffffff",
      ink: "#1d2425",
      inkSoft: "#667273",
      accent: "#42c7b5",
      accent2: "#e4c45e",
      panel: "#232b2c"
    },
    previewStyle: {
      background: "linear-gradient(135deg, #ffffff 0%, #f8f7f3 60%, #dff3ee 100%)",
      line: "#42c7b5",
      block: "#232b2c"
    },
    typography: {
      heading: "Inter Tight, Hiragino Sans, Yu Gothic, sans-serif",
      body: "Inter, Hiragino Sans, Yu Gothic, sans-serif",
      mono: "JetBrains Mono, ui-monospace, monospace"
    },
    visualRules: [
      "CATORCE internal proposal tone",
      "minimal page structure with strong one-line conclusions",
      "AI workflow diagrams",
      "quiet confidence, no hype"
    ],
    htmlTokens: {
      radius: "8px",
      stagePadding: "60px",
      titleSize: "52px",
      bodySize: "22px",
      captionSize: "14px"
    },
    layoutTypes: ["cover", "agenda", "comparison", "process", "benefit", "use_case", "safety", "closing"],
    negativeRules: [
      "Do not use generic AI robot imagery",
      "Do not use noisy gradients",
      "Do not make it look like a consumer landing page"
    ]
  },
  {
    id: "company-training-workshop",
    source: "company",
    name: "自社: 研修ワークショップ",
    description: "研修、勉強会、社内展開に向けた、やわらかい図解と実践ステップ中心のパターン。",
    moodKeywords: ["研修", "実践", "社内展開"],
    modeSupport: ["image", "html"],
    palette: {
      paper: "#f2f5f1",
      paperRaised: "#ffffff",
      ink: "#23302c",
      inkSoft: "#61716b",
      accent: "#4eaa72",
      accent2: "#e0a24b",
      panel: "#315246"
    },
    previewStyle: {
      background: "linear-gradient(135deg, #ffffff 0%, #f2f5f1 55%, #dbeadf 100%)",
      line: "#4eaa72",
      block: "#315246"
    },
    typography: {
      heading: "Inter Tight, Hiragino Sans, Yu Gothic, sans-serif",
      body: "Inter, Hiragino Sans, Yu Gothic, sans-serif",
      mono: "JetBrains Mono, ui-monospace, monospace"
    },
    visualRules: [
      "workshop facilitation deck",
      "friendly step-by-step diagrams",
      "visible practice examples",
      "make each slide useful as a handout"
    ],
    htmlTokens: {
      radius: "8px",
      stagePadding: "58px",
      titleSize: "50px",
      bodySize: "23px",
      captionSize: "15px"
    },
    layoutTypes: ["cover", "agenda", "process", "benefit", "use_case", "glossary", "closing"],
    negativeRules: [
      "Do not use stiff executive reporting style",
      "Do not overuse decorative icons",
      "Do not put too much text on one slide"
    ]
  },
  {
    id: "company-dark-executive",
    source: "company",
    name: "自社: エグゼクティブ濃色",
    description: "役員向け提案や大型PoCの説明に向いた、濃色パネルと高コントラスト図表のパターン。",
    moodKeywords: ["役員", "PoC", "重厚"],
    modeSupport: ["image", "html"],
    palette: {
      paper: "#eef1ee",
      paperRaised: "#ffffff",
      ink: "#101819",
      inkSoft: "#5d696a",
      accent: "#57d0c0",
      accent2: "#d7b45a",
      panel: "#172122"
    },
    previewStyle: {
      background: "linear-gradient(135deg, #172122 0%, #263334 58%, #eef1ee 100%)",
      line: "#57d0c0",
      block: "#d7b45a"
    },
    typography: {
      heading: "Inter Tight, Hiragino Sans, Yu Gothic, sans-serif",
      body: "Inter, Hiragino Sans, Yu Gothic, sans-serif",
      mono: "JetBrains Mono, ui-monospace, monospace"
    },
    visualRules: [
      "executive boardroom proposal",
      "high contrast panels with restrained accent lines",
      "make numbers and decisions easy to scan",
      "use crisp diagrams rather than decorative scenes"
    ],
    htmlTokens: {
      radius: "6px",
      stagePadding: "56px",
      titleSize: "48px",
      bodySize: "21px",
      captionSize: "14px"
    },
    layoutTypes: ["cover", "agenda", "comparison", "process", "benefit", "safety", "closing"],
    negativeRules: [
      "Do not use playful workshop style",
      "Do not use low contrast text",
      "Do not use glossy stock imagery"
    ]
  }
];

export function getTemplate(templateId: string) {
  return templates.find((template) => template.id === templateId) ?? templates[0];
}

export function getTemplatesBySource(source: TemplateSource) {
  return templates.filter((template) => template.source === source);
}
