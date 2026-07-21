export type DeckMode = "image" | "html";

export type DeckStatus = "draft" | "generating" | "review" | "completed" | "failed";

export type SlideStatus = "pending" | "generating" | "completed" | "failed";

export type TemplateSource = "system" | "company";

export type DeckType = "single" | "chapter";

export type AspectRatio = "16:9" | "4:3" | "1:1";

export type TypographyPreset = "gothic" | "mincho" | "mono";

export type TextVisibilityPreset = "standard" | "high" | "compact";

export type CoverMessagePosition = "left" | "right";

export type OutroLayout = "split" | "stacked";

export type LayoutType =
  | "cover"
  | "agenda"
  | "comparison"
  | "process"
  | "benefit"
  | "use_case"
  | "safety"
  | "glossary"
  | "closing";

export type TemplateDefinition = {
  id: string;
  source: TemplateSource;
  name: string;
  description: string;
  moodKeywords: string[];
  modeSupport: DeckMode[];
  palette: {
    paper: string;
    paperRaised: string;
    ink: string;
    inkSoft: string;
    accent: string;
    accent2: string;
    panel: string;
  };
  typography: {
    heading: string;
    body: string;
    mono: string;
  };
  previewStyle: {
    background: string;
    line: string;
    block: string;
  };
  visualRules: string[];
  htmlTokens: Record<string, string>;
  layoutTypes: LayoutType[];
  negativeRules: string[];
};

export type Slide = {
  id: string;
  pageNo: number;
  section: string;
  title: string;
  summary: string;
  body: string;
  speakerNotes: string;
  layoutType: LayoutType;
  htmlContent?: string;
  cssContent?: string;
  imageUrl?: string;
  imagePrompt?: string;
  status: SlideStatus;
};

export type Deck = {
  id: string;
  userId?: string;
  title: string;
  purpose: string;
  audience: string;
  language: string;
  mode: DeckMode;
  templateId: string;
  settings?: DeckGenerationRequest;
  status: DeckStatus;
  slideCount: number;
  slides: Slide[];
  createdAt: string;
  updatedAt: string;
};

export type ShareAdConfig = {
  kind: "none" | "text" | "image";
  text?: string;
  imageUrl?: string;
  linkUrl?: string;
};

export type PublicShare = {
  token: string;
  basicUser: string;
  deckId: string;
  title: string;
  deck: Deck;
  adConfig: ShareAdConfig;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicShareSummary = {
  token: string;
  deckId: string;
  title: string;
  slideCount: number;
  isPublic: boolean;
  adConfig: ShareAdConfig;
  viewCount: number;
  viewerCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ShareAnalytics = {
  token: string;
  title: string;
  totalViews: number;
  uniqueViewers: number;
  adClicks: number;
  pageViews: Array<{
    pageNo: number;
    title: string;
    views: number;
    uniqueViewers: number;
    totalSeconds: number;
  }>;
  recentEvents: Array<{
    eventType: "page_view" | "page_duration" | "ad_click";
    pageNo: number;
    viewerId: string;
    viewerLabel?: string;
    createdAt: string;
  }>;
};

export type DeckGenerationRequest = {
  title: string;
  purpose: string;
  audience: string;
  material: string;
  tone: string;
  slideCount: number;
  language: string;
  mode: DeckMode;
  templateSource: TemplateSource;
  templateId: string;
  deckType: DeckType;
  chapterTotal: number;
  chapterIndex: number;
  aspectRatio: AspectRatio;
  typographyPreset: TypographyPreset;
  textVisibility: TextVisibilityPreset;
  brandColor: string;
  showPageNumber: boolean;
  splitPagination: boolean;
  totalPages: number;
  pageNumberOffset: number;
  showFooterTitle: boolean;
  coverMessagePosition: CoverMessagePosition;
  outroLayout: OutroLayout;
  creditAuthor: string;
  creditOrganization: string;
  creditDate: string;
  creditContact: string;
  creditCta: string;
  extraNote: string;
};
