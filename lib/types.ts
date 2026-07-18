export type DeckMode = "image" | "html";

export type DeckStatus = "draft" | "generating" | "review" | "completed" | "failed";

export type SlideStatus = "pending" | "generating" | "completed" | "failed";

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
  name: string;
  description: string;
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
  status: DeckStatus;
  slideCount: number;
  slides: Slide[];
  createdAt: string;
  updatedAt: string;
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
  templateId: string;
};

