import type { TemplateDefinition } from "@/lib/types";

export const templates: TemplateDefinition[] = [
  {
    id: "soft-paper-guide",
    name: "やさしい紙質ガイド",
    description: "生成り紙、手描き図解、ミントの導線で初心者向けに説明するトンマナ。",
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
    name: "B2B戦略コンソール",
    description: "営業提案・経営報告に向いた、密度高めで落ち着いた業務UI風テンプレート。",
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
  }
];

export function getTemplate(templateId: string) {
  return templates.find((template) => template.id === templateId) ?? templates[0];
}

